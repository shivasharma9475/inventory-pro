
// Reads Razorpay / Stripe keys from CompanySettings DB (per-user)
// instead of hardcoded process.env
const Razorpay  = require("razorpay");
const Stripe    = require("stripe");
const crypto    = require("crypto");
const Bill      = require("../models/bill.model");
const Product   = require("../models/product.model");
const mongoose  = require("mongoose");
const { getDecryptedSecrets } = require("./companySettings.controller");

// ── Per-request SDK factory (keys come from DB per user) ──────────────────────
async function getRazorpayForUser(userId) {
  const secrets = await getDecryptedSecrets(userId);
  if (!secrets?.razorpay?.enabled)   throw Object.assign(new Error("Razorpay not configured or disabled"), { status: 400 });
  if (!secrets.razorpay.keyId)        throw Object.assign(new Error("Razorpay Key ID missing"),            { status: 400 });
  if (!secrets.razorpay.keySecret)    throw Object.assign(new Error("Razorpay Key Secret missing"),        { status: 400 });
  return { sdk: new Razorpay({ key_id: secrets.razorpay.keyId, key_secret: secrets.razorpay.keySecret }), secrets };
}

async function getStripeForUser(userId) {
  const secrets = await getDecryptedSecrets(userId);
  if (!secrets?.stripe?.enabled)    throw Object.assign(new Error("Stripe not configured or disabled"), { status: 400 });
  if (!secrets.stripe.secretKey)    throw Object.assign(new Error("Stripe Secret Key missing"),         { status: 400 });
  return { sdk: new Stripe(secrets.stripe.secretKey, { apiVersion: "2024-04-10" }), secrets };
}

// ── Shared helpers ────────────────────────────────────────────────────────────
async function enrichItems(rawItems, session) {
  const enriched = [];
  for (const raw of rawItems) {
    const product = await Product.findById(raw.productId).session(session || null);
    if (!product)                     throw Object.assign(new Error(`Product not found: ${raw.productId}`), { status: 404 });
    if (product.stock < raw.quantity) throw Object.assign(new Error(`Insufficient stock: "${product.name}"`), { status: 400 });
    const lineTotal = +(product.price * (1 - (product.discount || 0) / 100) * raw.quantity).toFixed(2);
    enriched.push({
      productId: product._id, name: product.name, category: product.category || "",
      price: product.price, discount: product.discount || 0,
      quantity: raw.quantity, lineTotal,
    });
  }
  return enriched;
}

function computeTotal(items, taxRate = 0) {
  const subtotal  = items.reduce((s, i) => s + i.lineTotal, 0);
  const taxAmount = +((subtotal * taxRate) / 100).toFixed(2);
  return { subtotal, taxAmount, totalAmount: +(subtotal + taxAmount).toFixed(2) };
}

function sanitizeBuyer(b) {
  return {
    name:    b.name?.trim()    || "",
    phone:   b.phone?.trim()   || "",
    email:   b.email?.trim().toLowerCase() || "",
    gst:     b.gst?.trim().toUpperCase()   || "",
    address: b.address?.trim() || "",
    city:    b.city?.trim()    || "",
    state:   b.state?.trim()   || "",
    pincode: b.pincode?.trim() || "",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. POST /api/payments/razorpay/create-order
// ─────────────────────────────────────────────────────────────────────────────
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { items, buyer, taxRate = 0 } = req.body;
    if (!buyer?.name || !buyer?.phone) return res.status(400).json({ success: false, message: "Buyer name and phone required" });

    const { sdk: razorpay, secrets } = await getRazorpayForUser(req.user._id);
    const enriched = await enrichItems(items);
    const { totalAmount } = computeTotal(enriched, taxRate);

    const order = await razorpay.orders.create({
      amount:   Math.round(totalAmount * 100),
      currency: "INR",
      receipt:  `rcpt_${Date.now()}`,
      notes:    { buyerName: buyer.name, buyerPhone: buyer.phone },
    });

    return res.json({
      success:  true,
      orderId:  order.id,
      amount:   order.amount,
      currency: order.currency,
      keyId:    secrets.razorpay.keyId,   // send key_id to frontend
    });
  } catch (err) {
    console.error("[createRazorpayOrder]", err);
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. POST /api/payments/razorpay/verify-and-bill
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyRazorpayAndBill = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, items, buyer, taxRate = 0, notes = "" } = req.body;

    // Get key_secret from DB for this user
    const secrets = await getDecryptedSecrets(req.user._id);
    if (!secrets?.razorpay?.keySecret) throw Object.assign(new Error("Razorpay not configured"), { status: 400 });

    // HMAC verification
    const expectedSig = crypto
      .createHmac("sha256", secrets.razorpay.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSig !== razorpay_signature) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Payment verification failed: invalid signature" });
    }

    const enriched = await enrichItems(items, session);
    const { taxAmount, totalAmount } = computeTotal(enriched, taxRate);

    for (const item of enriched) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } }, { session });
    }

    const [bill] = await Bill.create([{
      createdBy: req.user._id,
      buyer:     sanitizeBuyer(buyer),
      items:     enriched,
      payment: {
        method: "upi", status: "paid",
        razorpayOrderId:   razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        paidAt: new Date(),
      },
      totalAmount, taxRate, taxAmount, notes,
    }], { session });

    await session.commitTransaction();
    return res.status(201).json({ success: true, bill: await Bill.findById(bill._id).lean() });
  } catch (err) {
    await session.abortTransaction();
    console.error("[verifyRazorpayAndBill]", err);
    return res.status(err.status || 500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /api/payments/stripe/create-intent
// ─────────────────────────────────────────────────────────────────────────────
exports.createStripeIntent = async (req, res) => {
  try {
    const { items, buyer, taxRate = 0 } = req.body;
    if (!buyer?.name || !buyer?.phone) return res.status(400).json({ success: false, message: "Buyer name and phone required" });

    const { sdk: stripe } = await getStripeForUser(req.user._id);
    const enriched = await enrichItems(items);
    const { totalAmount } = computeTotal(enriched, taxRate);

    const intent = await stripe.paymentIntents.create({
      amount:   Math.round(totalAmount * 100),
      currency: "inr",
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: { buyerName: buyer.name, buyerPhone: buyer.phone, userId: String(req.user._id) },
    });

    return res.json({ success: true, clientSecret: intent.client_secret, intentId: intent.id });
  } catch (err) {
    console.error("[createStripeIntent]", err);
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. POST /api/payments/stripe/confirm-and-bill
// ─────────────────────────────────────────────────────────────────────────────
exports.confirmStripeAndBill = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { paymentIntentId, items, buyer, taxRate = 0, notes = "" } = req.body;

    const { sdk: stripe } = await getStripeForUser(req.user._id);
    const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status !== "succeeded") throw Object.assign(new Error(`Payment not confirmed. Status: ${intent.status}`), { status: 402 });

    const enriched = await enrichItems(items, session);
    const { taxAmount, totalAmount } = computeTotal(enriched, taxRate);

    for (const item of enriched) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } }, { session });
    }

    const charge = intent.latest_charge ? await stripe.charges.retrieve(intent.latest_charge) : null;

    const [bill] = await Bill.create([{
      createdBy: req.user._id,
      buyer:     sanitizeBuyer(buyer),
      items:     enriched,
      payment: {
        method: "card", status: "paid",
        stripePaymentIntentId: intent.id,
        last4:  charge?.payment_method_details?.card?.last4 || "",
        brand:  charge?.payment_method_details?.card?.brand || "",
        paidAt: new Date(),
      },
      totalAmount, taxRate, taxAmount, notes,
    }], { session });

    await session.commitTransaction();
    return res.status(201).json({ success: true, bill: await Bill.findById(bill._id).lean() });
  } catch (err) {
    await session.abortTransaction();
    console.error("[confirmStripeAndBill]", err);
    return res.status(err.status || 500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. POST /api/payments/bank/initiate
// ─────────────────────────────────────────────────────────────────────────────
exports.initiateBankTransfer = async (req, res) => {
  try {
    const { items, buyer, taxRate = 0, notes = "" } = req.body;
    if (!buyer?.name || !buyer?.phone) return res.status(400).json({ success: false, message: "Buyer name and phone required" });

    // Pull bank details from company settings
    const secrets  = await getDecryptedSecrets(req.user._id);
    const CompanySettings = require("../models/user.model");
    const settings = await CompanySettings.findOne({ owner: req.user._id }).lean();
    const bank     = settings?.bank || {};

    const enriched = await enrichItems(items);
    const { taxAmount, totalAmount } = computeTotal(enriched, taxRate);

    const count  = await Bill.countDocuments({ "payment.method": "bank_transfer", createdBy: req.user._id });
    const txnRef = `BTX-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const bill = await Bill.create({
      createdBy: req.user._id,
      buyer:     sanitizeBuyer(buyer),
      items:     enriched,
      payment:   { method: "bank_transfer", status: "pending", txnRef, paidAt: null },
      totalAmount, taxRate, taxAmount, notes,
    });

    return res.status(201).json({
      success: true,
      bill:    bill.toObject(),
      txnRef,
      bankDetails: {
        accountName: bank.accountName || "",
        bank:        bank.bankName    || "",
        accountNo:   bank.accountNo   || "",
        ifsc:        bank.ifsc        || "",
        amount:      totalAmount,
        reference:   txnRef,
      },
    });
  } catch (err) {
    console.error("[initiateBankTransfer]", err);
    return res.status(err.status || 500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. PATCH /api/payments/bank/verify/:billId  (admin only)
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyBankTransfer = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const bill = await Bill.findById(req.params.billId).session(session);
    if (!bill)                                  throw Object.assign(new Error("Bill not found"),                { status: 404 });
    if (bill.payment.method !== "bank_transfer") throw Object.assign(new Error("Not a bank transfer bill"),    { status: 400 });
    if (bill.payment.status === "paid")          throw Object.assign(new Error("Bill already paid"),           { status: 409 });

    for (const item of bill.items) {
      const product = await Product.findById(item.productId).session(session);
      if (!product || product.stock < item.quantity)
        throw Object.assign(new Error(`Insufficient stock for "${item.name}"`), { status: 400 });
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } }, { session });
    }

    bill.payment.status     = "paid";
    bill.payment.paidAt     = new Date();
    bill.payment.verifiedBy = req.user._id;
    if (req.body.txnRef) bill.payment.txnRef = req.body.txnRef;
    await bill.save({ session });

    await session.commitTransaction();
    return res.json({ success: true, bill: bill.toObject() });
  } catch (err) {
    await session.abortTransaction();
    console.error("[verifyBankTransfer]", err);
    return res.status(err.status || 500).json({ success: false, message: err.message });
  } finally {
    session.endSession();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. POST /api/payments/stripe/webhook
// ─────────────────────────────────────────────────────────────────────────────
exports.stripeWebhook = async (req, res) => {
  // Webhook secret must still come from env for global Stripe webhooks
  // OR iterate all company settings to find matching webhook secret (multi-tenant)
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    const Stripe = require("stripe");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object;
    await Bill.findOneAndUpdate(
      { "payment.stripePaymentIntentId": intent.id },
      { "payment.status": "failed" }
    );
  }
  res.json({ received: true });
};