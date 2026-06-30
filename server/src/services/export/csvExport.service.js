// server/src/services/export/csvExport.service.js
//
// Builds .csv exports. csv-writer's `createObjectCsvStringifier` returns
// plain strings (header / rows) rather than writing to a file path, which
// is what lets us stream chunks straight to the HTTP response with no temp
// files and no disk cleanup to worry about.
//
// Every function takes companyCode explicitly and applies it as a hard
// filter on every query — same multi-tenant rule as excelExport.service.js.

const { createObjectCsvStringifier } = require("csv-writer");
const Product = require("../../models/product.model");
const Bill = require("../../models/bill.model");
const Activity = require("../../models/activity.model");
const User = require("../../models/user.model");

const PRODUCT_HEADER = [
  { id: "name", title: "Product Name" },
  { id: "sku", title: "SKU" },
  { id: "barcode", title: "Barcode" },
  { id: "category", title: "Category" },
  { id: "price", title: "Price" },
  { id: "costPrice", title: "Cost Price" },
  { id: "stock", title: "Stock" },
  { id: "lowStockThreshold", title: "Low Stock Threshold" },
  { id: "unit", title: "Unit" },
  { id: "createdDate", title: "Created Date" },
];

/**
 * Streams a Product CSV export directly to `res`.
 * Same filter semantics as excelExport.service.js's streamProductsExcel —
 * kept deliberately identical so Excel/CSV exports of "the same view"
 * always contain the same rows.
 */
async function streamProductsCsv(res, companyCode, filters = {}) {
  if (!companyCode) {
    throw new Error("streamProductsCsv requires a companyCode — refusing to export without company scope");
  }

  const { search, category, tab, productIds } = filters;

  const query = {
    companyCode,
    isActive: tab === "deleted" ? false : true,
  };

  if (productIds && productIds.length > 0) {
    query._id = { $in: productIds };
  } else {
    if (category) query.category = category;
    if (search) {
      const re = new RegExp(search, "i");
      query.$or = [{ name: re }, { category: re }, { sku: re }, { barcode: re }];
    }
  }

  const stringifier = createObjectCsvStringifier({ header: PRODUCT_HEADER });

  // Write the header first so the client starts receiving bytes
  // immediately, then stream rows in small batches rather than one massive
  // string — keeps peak memory bounded regardless of export size.
  res.write(stringifier.getHeaderString());

  const cursor = Product.find(query).sort({ createdAt: -1 }).lean().cursor();

  const BATCH_SIZE = 500;
  let batch = [];
  let rowCount = 0;

  for await (const product of cursor) {
    batch.push({
      name: product.name,
      sku: product.sku || "",
      barcode: product.barcode || "",
      category: product.category,
      price: product.price,
      costPrice: product.costPrice || 0,
      stock: product.stock,
      lowStockThreshold: product.lowStockThreshold ?? "",
      unit: product.unit || "",
      createdDate: product.createdAt ? product.createdAt.toISOString().slice(0, 10) : "",
    });
    rowCount += 1;

    if (batch.length >= BATCH_SIZE) {
      res.write(stringifier.stringifyRecords(batch));
      batch = [];
    }
  }

  if (batch.length > 0) {
    res.write(stringifier.stringifyRecords(batch));
  }

  return rowCount;
}

const BILL_HEADER = [
  { id: "billId", title: "Bill ID" },
  { id: "date", title: "Date" },
  { id: "buyerName", title: "Customer Name" },
  { id: "buyerPhone", title: "Customer Phone" },
  { id: "itemCount", title: "Items" },
  { id: "paymentMethod", title: "Payment Method" },
  { id: "paymentStatus", title: "Payment Status" },
  { id: "taxAmount", title: "Tax Amount" },
  { id: "totalAmount", title: "Total Amount" },
  { id: "createdByName", title: "Created By" },
];

/**
 * Streams a Bill / sales-history CSV export directly to `res`.
 */
async function streamBillsCsv(res, companyCode, filters = {}) {
  if (!companyCode) {
    throw new Error("streamBillsCsv requires a companyCode — refusing to export without company scope");
  }

  const { from, to, method, billIds } = filters;

  const query = { companyCode };

  if (billIds && billIds.length > 0) {
    query._id = { $in: billIds };
  } else {
    if (method) query["payment.method"] = method;
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = from;
      if (to) query.createdAt.$lte = to;
    }
  }

  const stringifier = createObjectCsvStringifier({ header: BILL_HEADER });
  res.write(stringifier.getHeaderString());

  const cursor = Bill.find(query).sort({ createdAt: -1 }).lean().cursor();
  const creatorNameCache = new Map();

  const BATCH_SIZE = 500;
  let batch = [];
  let rowCount = 0;

  for await (const bill of cursor) {
    const creatorId = String(bill.createdBy);
    if (!creatorNameCache.has(creatorId)) {
      const creator = await User.findById(bill.createdBy).select("name email").lean();
      creatorNameCache.set(creatorId, creator?.name || creator?.email || "Unknown");
    }

    batch.push({
      billId: bill.billId,
      date: bill.createdAt ? bill.createdAt.toISOString().slice(0, 10) : "",
      buyerName: bill.buyer?.name || "",
      buyerPhone: bill.buyer?.phone || "",
      itemCount: bill.items?.length || 0,
      paymentMethod: bill.payment?.method || "",
      paymentStatus: bill.payment?.status || "",
      taxAmount: bill.taxAmount || 0,
      totalAmount: bill.totalAmount || 0,
      createdByName: creatorNameCache.get(creatorId),
    });
    rowCount += 1;

    if (batch.length >= BATCH_SIZE) {
      res.write(stringifier.stringifyRecords(batch));
      batch = [];
    }
  }

  if (batch.length > 0) {
    res.write(stringifier.stringifyRecords(batch));
  }

  return rowCount;
}

const ACTIVITY_HEADER = [
  { id: "date", title: "Date" },
  { id: "time", title: "Time" },
  { id: "userName", title: "User" },
  { id: "role", title: "Role" },
  { id: "action", title: "Action" },
  { id: "entity", title: "Entity" },
  { id: "message", title: "Message" },
];

/**
 * Streams an Activity log CSV export directly to `res`.
 *
 * @param {object} [filters]
 * @param {Date} [filters.from] - already clamped to the 7-day retention window by the controller
 * @param {Date} [filters.to]
 * @param {string} [filters.userId] - filter to one user's actions only
 */
async function streamActivityCsv(res, companyCode, filters = {}) {
  if (!companyCode) {
    throw new Error("streamActivityCsv requires a companyCode — refusing to export without company scope");
  }

  const { from, to, userId } = filters;

  const query = { companyCode };
  if (userId) query.userId = userId;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = from;
    if (to) query.createdAt.$lte = to;
  }

  const stringifier = createObjectCsvStringifier({ header: ACTIVITY_HEADER });
  res.write(stringifier.getHeaderString());

  const cursor = Activity.find(query).sort({ createdAt: -1 }).lean().cursor();

  const BATCH_SIZE = 500;
  let batch = [];
  let rowCount = 0;

  for await (const activity of cursor) {
    const createdAt = activity.createdAt ? new Date(activity.createdAt) : null;
    batch.push({
      date: createdAt ? createdAt.toISOString().slice(0, 10) : "",
      time: createdAt ? createdAt.toISOString().slice(11, 19) : "",
      userName: activity.userName || "",
      role: activity.role || "",
      action: activity.action || "",
      entity: activity.entity || "",
      message: activity.message || "",
    });
    rowCount += 1;

    if (batch.length >= BATCH_SIZE) {
      res.write(stringifier.stringifyRecords(batch));
      batch = [];
    }
  }

  if (batch.length > 0) {
    res.write(stringifier.stringifyRecords(batch));
  }

  return rowCount;
}

module.exports = {
  streamProductsCsv,
  streamBillsCsv,
  streamActivityCsv,
};