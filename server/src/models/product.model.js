const mongoose = require("mongoose");

// Each entry is one bill's contribution to this product's sales — NOT a
// running total and NOT a flat number array. The previous shape
// (salesHistory: [10, 20, 30]) had no way to know which month/bill a
// number belonged to, couldn't be deduplicated, and isn't even what was
// declared on this schema (the field didn't exist here at all before this
// change, despite dashboard.controller.js reading it everywhere).
//
// `billId` is what makes this safe to rebuild/re-run migrations against —
// see scripts/rebuild-sales-history.js, which uses it to skip bills that
// already have a matching entry instead of double-counting.
const salesHistoryEntrySchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    revenue: {
      type: Number,
      required: true,
      min: 0,
    },
    billId: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name:{ 
      type: String, required: true, trim: true
    },
    sku:{ 
      type: String, unique: true, sparse: true 
    },
    barcode:{
      type: String, unique: true, sparse: true, index: true
      // EAN-13/UPC code from a physical barcode label, if different from SKU
    },
    category:{
       type: String, required: true 
      },
    price:{
       type: Number, required: true, min: 0 
      },
    costPrice:{
       type: Number, default: 0, min: 0 
      },
    stock:{
       type: Number, required: true, default: 0, min: 0 
      },
    lowStockThreshold:{
       type: Number, default: 10 
      },
    unit:{ 
      type: String, default: "pcs"
     },
    description:{
       type: String 
      },
      seller: {
      type: String,
      default: "Unknown Supplier",
      trim: true,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isActive:{ 
      type: Boolean, default: true 
    },
    companyCode: {
      type: String,
      required: true,
      index: true,
    },

    // Denormalized, per-product sales log — kept ONLY for fast dashboard
    // reads and product-level "sales history" display. Bill is the actual
    // source of truth; this array is rebuilt FROM bills (see
    // scripts/rebuild-sales-history.js) and appended to whenever a bill is
    // created (see bill.controller.js's processItems), never the reverse.
    // Do not trust this for anything that needs to be exactly correct
    // (financial reports, audits) — query Bill directly for those.
    salesHistory: {
      type: [salesHistoryEntrySchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Powers "has this bill already been recorded for this product" checks
// (both in the live billing flow and the rebuild migration) without a full
// array scan in application code.
productSchema.index({ "salesHistory.billId": 1 });

module.exports = mongoose.model("Product", productSchema);