const mongoose = require("mongoose");

const BillItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name:      { type: String, required: true },
  category:  { type: String, default: "" },
  price:     { type: Number, required: true },
  discount:  { type: Number, default: 0 },
  quantity:  { type: Number, required: true, min: 1 },
  lineTotal: { type: Number, required: true },
}, { _id: false });

const BuyerSchema = new mongoose.Schema({
  name:    { type: String, required: true, trim: true },
  phone:   { type: String, required: true, trim: true },
  email:   { type: String, default: "", trim: true, lowercase: true },
  gst:     { type: String, default: "", trim: true, uppercase: true },
  address: { type: String, default: "" },
  city:    { type: String, default: "" },
  state:   { type: String, default: "" },
  pincode: { type: String, default: "" },
}, { _id: false });

const PaymentSchema = new mongoose.Schema({
  method: { type: String, required: true, enum: ["upi", "card", "bank_transfer", "cash"] },
  status: { type: String, enum: ["paid", "pending", "failed", "refunded"], default: "pending" },
  razorpayOrderId:       { type: String, default: "" },
  razorpayPaymentId:     { type: String, default: "" },
  razorpaySignature:     { type: String, default: "" },
  stripePaymentIntentId: { type: String, default: "" },
  last4:      { type: String, default: "" },
  brand:      { type: String, default: "" },
  txnRef:     { type: String, default: "" },
  verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  paidAt:     { type: Date, default: null },
}, { _id: false });

const BillSchema = new mongoose.Schema({
  billId:      { type: String, unique: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  // Denormalized from the creating user at bill-creation time, same pattern
  // as Product/Activity. Without this, company-wide reports (e.g. "all
  // sales for this company" exports) would have no correct way to scope a
  // query — `createdBy` only identifies the one staff/admin who rang up
  // the sale, not which company they belong to. Required with a default of
  // "" rather than `required: true` so existing bills created before this
  // field existed don't fail validation on unrelated updates; the backfill
  // script (see migrations note) should be run once after deploying this.
  companyCode: { type: String, default: "", index: true },
  buyer:       { type: BuyerSchema,      required: true },
  items:       { type: [BillItemSchema], required: true, validate: [(a) => a.length > 0, "At least one item required"] },
  payment:     { type: PaymentSchema,    required: true },
  totalAmount: { type: Number, required: true },
  taxRate:     { type: Number, default: 0 },
  taxAmount:   { type: Number, default: 0 },
  notes:       { type: String, default: "" },
}, { timestamps: true });

BillSchema.pre("validate", async function (next) {
  if (!this.billId) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const count   = await mongoose.model("Bill").countDocuments();
    this.billId   = `BILL-${dateStr}-${String(count + 1).padStart(4, "0")}`;
  }
});

BillSchema.index({ createdBy: 1, createdAt: -1 });
BillSchema.index({ companyCode: 1, createdAt: -1 });
BillSchema.index({ "payment.status": 1 });
BillSchema.index({ "payment.method": 1 });
BillSchema.index({ "payment.razorpayPaymentId": 1 }, { sparse: true });
BillSchema.index({ "payment.stripePaymentIntentId": 1 }, { sparse: true });
BillSchema.index({ "payment.txnRef": 1 }, { sparse: true });

module.exports = mongoose.model("Bill", BillSchema);