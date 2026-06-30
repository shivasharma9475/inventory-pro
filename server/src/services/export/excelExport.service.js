// server/src/services/export/excelExport.service.js
//
// Builds .xlsx exports using exceljs's STREAMING WorkbookWriter (not the
// plain in-memory Workbook) — rows are written and flushed as they're
// queried, instead of holding the entire workbook in memory before sending
// anything to the client. This matters for "support large exports" (a
// company with tens of thousands of products/bills shouldn't spike server
// memory on every export).
//
// Every function here takes companyCode explicitly (passed in by the
// controller, sourced from req.user.companyCode — see exportAuth in the
// controller) and applies it as a hard filter on every query. No function
// in this file accepts a company-unscoped query from the caller.

const ExcelJS = require("exceljs");
const Product = require("../../models/product.model");
const Bill = require("../../models/bill.model");

const PRODUCT_COLUMNS = [
  { header: "Product Name", key: "name", width: 30 },
  { header: "SKU", key: "sku", width: 18 },
  { header: "Barcode", key: "barcode", width: 18 },
  { header: "Category", key: "category", width: 18 },
  { header: "Price", key: "price", width: 12 },
  { header: "Cost Price", key: "costPrice", width: 12 },
  { header: "Stock", key: "stock", width: 10 },
  { header: "Low Stock Threshold", key: "lowStockThreshold", width: 18 },
  { header: "Unit", key: "unit", width: 10 },
  { header: "Created Date", key: "createdDate", width: 16 },
];

/**
 * Streams a Product export workbook directly to `res`.
 *
 * @param {import('express').Response} res - written to directly (streaming)
 * @param {string} companyCode - REQUIRED. Every query is filtered by this.
 * @param {object} [filters]
 * @param {string} [filters.search] - matches name/category/sku, same as the Products page search
 * @param {string} [filters.category] - exact category filter
 * @param {string} [filters.tab] - "active" (default) or "deleted", mirrors product.controller.js's getProducts
 * @param {string[]} [filters.productIds] - if provided, export ONLY these products (already validated ObjectIds)
 */
async function streamProductsExcel(res, companyCode, filters = {}) {
  if (!companyCode) {
    throw new Error("streamProductsExcel requires a companyCode — refusing to export without company scope");
  }

  const { search, category, tab, productIds } = filters;

  const query = {
    companyCode, // hard multi-tenant filter — always applied, never optional
    isActive: tab === "deleted" ? false : true,
  };

  if (productIds && productIds.length > 0) {
    // "Export only selected products" — explicit id list takes precedence
    // over search/category, matching how a user would expect a checkbox
    // selection to behave (export exactly what I selected, nothing more).
    query._id = { $in: productIds };
  } else {
    if (category) query.category = category;
    if (search) {
      const re = new RegExp(search, "i");
      query.$or = [{ name: re }, { category: re }, { sku: re }, { barcode: re }];
    }
  }

  const workbookWriter = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
  const worksheet = workbookWriter.addWorksheet("Products");
  worksheet.columns = PRODUCT_COLUMNS;

  // Bold header row, matching the look of a normal in-memory workbook —
  // WorkbookWriter still supports per-row styling even though it streams.
  worksheet.getRow(1).font = { bold: true };

  // .lean().cursor() streams documents from MongoDB one at a time instead of
  // loading the full result set into memory — this is what actually makes
  // large exports memory-safe end to end (DB -> Node -> HTTP response),
  // not just the xlsx-writing side.
  const cursor = Product.find(query).sort({ createdAt: -1 }).lean().cursor();

  let rowCount = 0;
  for await (const product of cursor) {
    worksheet
      .addRow({
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
      })
      .commit();
    rowCount += 1;
  }

  worksheet.commit();
  await workbookWriter.commit();

  return rowCount;
}

const BILL_COLUMNS = [
  { header: "Bill ID", key: "billId", width: 20 },
  { header: "Date", key: "date", width: 14 },
  { header: "Customer Name", key: "buyerName", width: 24 },
  { header: "Customer Phone", key: "buyerPhone", width: 16 },
  { header: "Items", key: "itemCount", width: 8 },
  { header: "Payment Method", key: "paymentMethod", width: 16 },
  { header: "Payment Status", key: "paymentStatus", width: 16 },
  { header: "Tax Amount", key: "taxAmount", width: 14 },
  { header: "Total Amount", key: "totalAmount", width: 14 },
  { header: "Created By", key: "createdByName", width: 20 },
];

/**
 * Streams a Bill/invoice export workbook directly to `res`.
 *
 * @param {object} [filters]
 * @param {Date} [filters.from] - already-validated Date (see exportHelpers.parseDateRange)
 * @param {Date} [filters.to]
 * @param {string} [filters.method] - payment method filter
 * @param {string[]} [filters.billIds] - explicit selection, takes precedence over date range
 */
async function streamBillsExcel(res, companyCode, filters = {}) {
  if (!companyCode) {
    throw new Error("streamBillsExcel requires a companyCode — refusing to export without company scope");
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

  const workbookWriter = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
  const worksheet = workbookWriter.addWorksheet("Bills");
  worksheet.columns = BILL_COLUMNS;
  worksheet.getRow(1).font = { bold: true };

  // .populate() doesn't work with .cursor() the same way on every mongoose
  // version, so we look up creator names separately in batches rather than
  // populating per-document — keeps this fast even for large exports.
  const cursor = Bill.find(query).sort({ createdAt: -1 }).lean().cursor();

  const User = require("../../models/user.model");
  const creatorNameCache = new Map();

  let rowCount = 0;
  for await (const bill of cursor) {
    const creatorId = String(bill.createdBy);
    if (!creatorNameCache.has(creatorId)) {
      const creator = await User.findById(bill.createdBy).select("name email").lean();
      creatorNameCache.set(creatorId, creator?.name || creator?.email || "Unknown");
    }

    worksheet
      .addRow({
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
      })
      .commit();
    rowCount += 1;
  }

  worksheet.commit();
  await workbookWriter.commit();

  return rowCount;
}

module.exports = {
  PRODUCT_COLUMNS,
  BILL_COLUMNS,
  streamProductsExcel,
  streamBillsExcel,
};