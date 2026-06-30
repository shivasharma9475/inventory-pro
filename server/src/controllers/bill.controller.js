const Bill    = require("../models/bill.model");
const Product = require("../models/product.model");  // adjust path if needed
const mongoose = require("mongoose");
const logActivity = require("../utils/activityLogger");
const { emitToCompany } = require("../socket");

// ─────────────────────────────────────────────────────────────────────────────
// Helper: validate & enrich items (read-only — no writes here).
//
// Stock deduction used to happen in this function, but salesHistory entries
// need the bill's billId, which doesn't exist until AFTER Bill.create()
// runs (billId is generated in a pre("validate") hook). So both the stock
// deduction AND the salesHistory append now happen together, in one
// $inc + $push per product, after the bill is created — still inside the
// same transaction/session, so it's all still atomic with the rest of the
// bill (see applyStockAndSalesHistory below).
// ─────────────────────────────────────────────────────────────────────────────
async function processItems(rawItems, session) {
  const enriched = [];

  for (const raw of rawItems) {
    if (!raw.productId || !raw.quantity || raw.quantity < 1) {
      throw Object.assign(new Error(`Invalid item: ${JSON.stringify(raw)}`), { status: 400 });
    }

    const product = await Product.findById(raw.productId).session(session);
    if (!product) throw Object.assign(new Error(`Product not found: ${raw.productId}`), { status: 404 });
    if (product.stock < raw.quantity) {
      throw Object.assign(new Error(`Insufficient stock for "${product.name}" (available: ${product.stock})`), { status: 400 });
    }

    const lineTotal = product.price * (1 - (product.discount || 0) / 100) * raw.quantity;

    enriched.push({
      productId: product._id,
      name:      product.name,
      category:  product.category || "",
      price:     product.price,
      discount:  product.discount || 0,
      quantity:  raw.quantity,
      lineTotal: parseFloat(lineTotal.toFixed(2)),
    });
  }

  return enriched;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deducts stock AND appends a salesHistory entry for every item on a bill,
// in one update per product. Called after the bill exists (so billId is
// available), still inside the same session — if anything here throws, the
// caller's transaction abort rolls back the bill creation too.
//
// Duplicate-safety: uses billId as a natural dedupe key. If this bill's
// items were somehow already recorded for a product (e.g. a retry after a
// partial failure), $push would still add a second entry — so this checks
// for an existing entry with the same billId first and skips it. This
// matters because createBill can, in rare failure/retry scenarios, be
// called more than once for what the client thinks is "one" bill creation.
// ─────────────────────────────────────────────────────────────────────────────
async function applyStockAndSalesHistory(enrichedItems, billId, session) {
  for (const item of enrichedItems) {
    const alreadyRecorded = await Product.exists({
      _id: item.productId,
      "salesHistory.billId": billId,
    }).session(session);

    if (alreadyRecorded) continue; // see dedupe note above

    await Product.findByIdAndUpdate(
      item.productId,
      {
        $inc: { stock: -item.quantity },
        $push: {
          salesHistory: {
            date: new Date(),
            quantity: item.quantity,
            revenue: item.lineTotal,
            billId,
          },
        },
      },
      { session }
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bills  — Create a bill
// ─────────────────────────────────────────────────────────────────────────────
exports.createBill = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, buyer, payment, taxRate = 0, notes = "" } = req.body;

    // ── Validate buyer ──
    if (!buyer?.name || !buyer?.phone) {
      return res.status(400).json({ success: false, message: "Buyer name and phone are required" });
    }

    // ── Validate payment method ──
    const allowedMethods = ["cash", "upi", "card", "bank_transfer"];
    if (!payment?.method || !allowedMethods.includes(payment.method)) {
      return res.status(400).json({ success: false, message: "Valid payment method is required" });
    }

    // ── Process items & deduct stock ──
    const enrichedItems = await processItems(items, session);

    // ── Compute totals ──
    const subtotal    = enrichedItems.reduce((s, i) => s + i.lineTotal, 0);
    const taxAmount   = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
    const totalAmount = parseFloat((subtotal + taxAmount).toFixed(2));

    // ── Build payment object ──
    const paymentData = {
      method: payment.method,
      status: "paid",
      paidAt: new Date(),
    };

    if (payment.method === "upi")          paymentData.upiRef  = payment.upiRef  || "";
    if (payment.method === "bank_transfer") paymentData.txnRef  = payment.txnRef  || "";
    if (payment.method === "card") {
      // NOTE: For Stripe, you should create a PaymentIntent server-side and
      // confirm it here using payment.stripePaymentMethodId.
      // For now we store the method ID returned from the frontend.
      paymentData.stripePaymentMethodId = payment.stripePaymentMethodId || "";
      paymentData.last4  = payment.last4  || "";
      paymentData.brand  = payment.brand  || "";
    }

    // ── Create bill ──
    const [bill] = await Bill.create(
      [
        {
          createdBy:   req.user._id,          // from auth middleware
          companyCode: req.user.companyCode,   // for company-wide reporting/export — see bill.model.js
          buyer:       {
            name:    buyer.name.trim(),
            phone:   buyer.phone.trim(),
            email:   buyer.email?.trim() || "",
            gst:     buyer.gst?.trim().toUpperCase() || "",
            address: buyer.address?.trim() || "",
            city:    buyer.city?.trim() || "",
            state:   buyer.state?.trim() || "",
            pincode: buyer.pincode?.trim() || "",
          },
          items:       enrichedItems,
          payment:     paymentData,
          totalAmount,
          taxRate,
          taxAmount,
          notes,
        },
      ],
      { session }
    );

    // Stock deduction + salesHistory append happen here, now that the
    // bill (and its billId) exists — still inside the same transaction, so
    // a failure here rolls back the bill creation too, not just this step.
    await applyStockAndSalesHistory(enrichedItems, bill.billId, session);

    await session.commitTransaction();

    // 🔥 Real-time: billing deducts stock directly inside the transaction
    // (bypassing the standalone updateStock endpoint), so without this the
    // Dashboard/Products screens would never see live stock drop from a
    // sale — only from a manual stock edit. Emit both the bill event and a
    // stock update per affected product, scoped to this company's room.
    emitToCompany(req.user.companyCode, "bill:created", {
      billId: bill.billId,
      totalAmount,
      totalItems: enrichedItems.length,
      customer: buyer.name,
      createdBy: req.user.name || "Staff",
    });

    for (const item of enrichedItems) {
      const updatedProduct = await Product.findById(item.productId).lean();
      if (updatedProduct) {
        emitToCompany(req.user.companyCode, "product:stockUpdated", {
          productId: updatedProduct._id,
          stock: updatedProduct.stock,
          productName: updatedProduct.name,
          updatedBy: req.user.name || "Staff",
        });
      }
    }

    await logActivity({
user: req.user,

action: "CREATE_BILL",

entity: "BILL",

entityId: bill._id,

entityData: {
billId: bill.billId,
customer: buyer.name,
totalAmount,
totalItems: enrichedItems.length,
paymentMethod: payment.method,
},

req,
});


    // Return populated bill
    const populated = await Bill.findById(bill._id).lean();
    return res.status(201).json({ success: true, ...populated });

  } catch (err) {
    await session.abortTransaction();
    console.error("[createBill]", err);
    return res.status(err.status || 500).json({ success: false, message: err.message || "Failed to create bill" });
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bills  — List bills (paginated, filterable)
// Scoped by companyCode (not createdBy) so any staff/admin in the company
// sees all of the company's bills — matches how Products/Activity already
// work. IMPORTANT: requires the backfill script
// (scripts/backfill-bill-company-code.js) to have been run, or bills
// created before companyCode existed on the schema won't show up here.
// ─────────────────────────────────────────────────────────────────────────────
exports.getBills = async (req, res) => {
  try {
    const {
      page    = 1,
      limit   = 20,
      method,         // filter by payment method
      search,         // search buyer name / phone / billId
      from,           // ISO date string
      to,
    } = req.query;

    const filter = { companyCode: req.user.companyCode };

    if (method)  filter["payment.method"] = method;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to)   filter.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }
    if (search) {
      const re = new RegExp(search, "i");
      filter.$or = [
        { billId: re },
        { "buyer.name": re },
        { "buyer.phone": re },
        { "buyer.email": re },
      ];
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Bill.countDocuments(filter);
    const bills = await Bill.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    return res.json({
      success: true,
      data: bills,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[getBills]", err);
    return res.status(500).json({ success: false, message: "Failed to fetch bills" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bills/:id  — Single bill
// ─────────────────────────────────────────────────────────────────────────────
exports.getBillById = async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, companyCode: req.user.companyCode }).lean();
    if (!bill) return res.status(404).json({ success: false, message: "Bill not found" });
    return res.json({ success: true, data: bill });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to fetch bill" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bills/analytics/summary  — Sales summary for dashboard
// ─────────────────────────────────────────────────────────────────────────────
exports.getSalesSummary = async (req, res) => {
  try {
    const { from, to } = req.query;
    const matchBase = { companyCode: req.user.companyCode };
    if (from || to) {
      matchBase.createdAt = {};
      if (from) matchBase.createdAt.$gte = new Date(from);
      if (to)   matchBase.createdAt.$lte = new Date(new Date(to).setHours(23, 59, 59, 999));
    }

    const [summary] = await Bill.aggregate([
      { $match: matchBase },
      {
        $group: {
          _id:            null,
          totalRevenue:   { $sum: "$totalAmount" },
          totalBills:     { $sum: 1 },
          totalItemsSold: { $sum: { $sum: "$items.quantity" } },
          avgBillValue:   { $avg: "$totalAmount" },
        },
      },
    ]);

    // Revenue by payment method
    const byMethod = await Bill.aggregate([
      { $match: matchBase },
      { $group: { _id: "$payment.method", revenue: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
    ]);

    // Daily revenue (last 30 days if no filter)
    const dailyFrom = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const daily = await Bill.aggregate([
      { $match: { ...matchBase, createdAt: { $gte: dailyFrom } } },
      {
        $group: {
          _id:     { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          bills:   { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Top products
    const topProducts = await Bill.aggregate([
      { $match: matchBase },
      { $unwind: "$items" },
      {
        $group: {
          _id:      "$items.productId",
          name:     { $first: "$items.name" },
          qty:      { $sum: "$items.quantity" },
          revenue:  { $sum: "$items.lineTotal" },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
    ]);

    return res.json({
      success: true,
      data: {
        summary: summary || { totalRevenue: 0, totalBills: 0, totalItemsSold: 0, avgBillValue: 0 },
        byMethod,
        daily,
        topProducts,
      },
    });
  } catch (err) {
    console.error("[getSalesSummary]", err);
    return res.status(500).json({ success: false, message: "Failed to fetch analytics" });
  }
};