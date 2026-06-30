const mongoose  = require("mongoose");
const bcrypt    = require("bcryptjs");
const crypto    = require("crypto");

const CIPHER_KEY = process.env.SETTINGS_CIPHER_KEY || "change-this-32-char-key-in-env!!";

function encrypt(text) {
  if (!text) return "";
  const iv      = crypto.randomBytes(16);
  const cipher  = crypto.createCipheriv("aes-256-cbc", Buffer.from(CIPHER_KEY), iv);
  const enc     = Buffer.concat([cipher.update(text), cipher.final()]);
  return iv.toString("hex") + ":" + enc.toString("hex");
}

function decrypt(text) {
  if (!text || !text.includes(":")) return text || "";
  try {
    const [ivHex, encHex] = text.split(":");
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(CIPHER_KEY), Buffer.from(ivHex, "hex"));
    return Buffer.concat([decipher.update(Buffer.from(encHex, "hex")), decipher.final()]).toString();
  } catch { return ""; }
}

// ── Sub-schemas (admin only fields) ──────────────────────────────────────────

const BankSchema = new mongoose.Schema({
  accountName: { type: String, default: "" },
  bankName:    { type: String, default: "" },
  accountNo:   { type: String, default: "" },
  ifsc:        { type: String, default: "", uppercase: true },
  branch:      { type: String, default: "" },
  accountType: { type: String, default: "Current", enum: ["Current", "Savings"] },
}, { _id: false });

const UpiSchema = new mongoose.Schema({
  id:   { type: String, default: "" },  // e.g. myshop@upi
  name: { type: String, default: "" },  // display name
}, { _id: false });

// Secrets stored encrypted — select: false means they NEVER come out by default
const RazorpaySchema = new mongoose.Schema({
  keyId:     { type: String, default: "" },
  keySecret: { type: String, default: "", select: false },  // encrypted
  enabled:   { type: Boolean, default: false },
}, { _id: false });

const StripeSchema = new mongoose.Schema({
  publishableKey: { type: String, default: "" },
  secretKey:      { type: String, default: "", select: false },  // encrypted
  webhookSecret:  { type: String, default: "", select: false },  // encrypted
  enabled:        { type: Boolean, default: false },
}, { _id: false });

const InvoiceSchema = new mongoose.Schema({
  prefix:     { type: String, default: "BILL" },
  termsNotes: { type: String, default: "" },
  footerText: { type: String, default: "Thank you for your business 🙏" },
  showLogo:   { type: Boolean, default: true },
  showGst:    { type: Boolean, default: true },
}, { _id: false });

const EnabledPaymentMethodsSchema = new mongoose.Schema({
  cash:         { type: Boolean, default: true },
  upi:          { type: Boolean, default: false },
  card:         { type: Boolean, default: false },
  bankTransfer: { type: Boolean, default: false },
}, { _id: false });

// ── Main User Schema ──────────────────────────────────────────────────────────

const userSchema = new mongoose.Schema(
  {
    // ── Role ─────────────────────────────────────────────────────────────
    role: {
      type:    String,
      enum:    ["admin", "staff"],
      default: "admin",
    },

    // ── Identity ──────────────────────────────────────────────────────────
    name: {
      type: String,
      trim: true,
    },

    profileImage: {
      url: { type: String, default: "" },
      fileId: { type: String, default: "" },
    },

    email: {
      type:      String,
      required:  true,
      unique:    true,
      lowercase: true,
      index:     true,
      match:     [/^\S+@\S+\.\S+$/, "Please use a valid email"],
    },

    password: {
      type:      String,
      required:  true,
      minlength: 6,
    },

    designation: {
      type:    String,
      default: "",
    },

    profileImage: {
      url:    String,
      fileId: String,
    },

    // ── Company (admin only) ──────────────────────────────────────────────
    companyName: {
      type:     String,
      required: true,
      trim:     true,
    },

    companyCode: {
      type:     String,
      required: true,
      index:    true,
    },

    companyLogo: {
      url:    String,
      fileId: String,
    },

    // Company logo as base64 (for invoice rendering without fileId dependency)
    companyLogoBase64: {
      type:    String,
      default: "",
    },

    tagline: {
      type:    String,
      default: "",
      trim:    true,
    },

    website: {
      type:    String,
      default: "",
      trim:    true,
    },

    phone: {
      type:     String,
      required: function () { return this.role === "admin"; },
      match:    [/^\+?[1-9]\d{9,14}$/, "Invalid phone number"],
    },

    country: {
      type:     String,
      required: function () { return this.role === "admin"; },
      default:  "India",
    },

    state: {
      type:     String,
      required: function () { return this.role === "admin"; },
    },

    city: {
      type:     String,
      required: function () { return this.role === "admin"; },
    },

    address: {
      type:    String,
      default: "",
    },

    pincode: {
      type:    String,
      default: "",
    },

    // ── GST / Tax (admin only) ────────────────────────────────────────────
    gst: {
      type:      String,
      default:   "",
      uppercase: true,
      trim:      true,
    },

    pan: {
      type:      String,
      default:   "",
      uppercase: true,
      trim:      true,
    },

    defaultTaxRate: {
      type:    Number,
      default: 0,
      min:     0,
      max:     100,
    },

    // ── Payment config (admin only) ───────────────────────────────────────
    bank:                  { type: BankSchema,                  default: () => ({}) },
    upi:                   { type: UpiSchema,                   default: () => ({}) },
    razorpay:              { type: RazorpaySchema,              default: () => ({}) },
    stripe:                { type: StripeSchema,                default: () => ({}) },
    invoice:               { type: InvoiceSchema,               default: () => ({}) },
    enabledPaymentMethods: { type: EnabledPaymentMethodsSchema, default: () => ({}) },

    // ── Staff → Admin link ────────────────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  "User",
    },

    // ── OTP / Verification ────────────────────────────────────────────────
    otp:             String,
    otpExpiry:       Date,
    otpCooldown:     Date,
    isVerified:      { type: Boolean, default: false },
    isResetVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ── Hash password before save ─────────────────────────────────────────────────
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt    = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ── Encrypt Razorpay / Stripe secrets before save ─────────────────────────────
userSchema.pre("save", function (next) {
  // Only encrypt if the field was actually modified and isn't already encrypted
  if (this.isModified("razorpay.keySecret") && this.razorpay?.keySecret && !this.razorpay.keySecret.includes(":")) {
    this.razorpay.keySecret = encrypt(this.razorpay.keySecret);
  }
  if (this.isModified("stripe.secretKey") && this.stripe?.secretKey && !this.stripe.secretKey.includes(":")) {
    this.stripe.secretKey = encrypt(this.stripe.secretKey);
  }
  if (this.isModified("stripe.webhookSecret") && this.stripe?.webhookSecret && !this.stripe.webhookSecret.includes(":")) {
    this.stripe.webhookSecret = encrypt(this.stripe.webhookSecret);
  }
});

// ── Compare password ──────────────────────────────────────────────────────────
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// ── Get decrypted payment secrets (used by paymentController) ─────────────────
userSchema.methods.getPaymentSecrets = function () {
  return {
    razorpay: {
      keyId:     this.razorpay?.keyId     || "",
      keySecret: decrypt(this.razorpay?.keySecret || ""),
      enabled:   this.razorpay?.enabled   || false,
    },
    stripe: {
      publishableKey: this.stripe?.publishableKey || "",
      secretKey:      decrypt(this.stripe?.secretKey      || ""),
      webhookSecret:  decrypt(this.stripe?.webhookSecret  || ""),
      enabled:        this.stripe?.enabled || false,
    },
    upi:  { id: this.upi?.id || "", name: this.upi?.name || "" },
    bank: this.bank?.toObject ? this.bank.toObject() : (this.bank || {}),
  };
};

// ── Mask secrets for API responses ────────────────────────────────────────────
userSchema.methods.toSafeObject = function () {
  const obj = this.toObject({ virtuals: true });

  function mask(str) {
    const dec = decrypt(str || "");
    if (!dec || dec.length < 4) return dec ? "••••••••" : "";
    return "••••••••••••" + dec.slice(-4);
  }

  if (obj.razorpay) obj.razorpay.keySecret   = mask(this.razorpay?.keySecret);
  if (obj.stripe)   {
    obj.stripe.secretKey    = mask(this.stripe?.secretKey);
    obj.stripe.webhookSecret = mask(this.stripe?.webhookSecret);
  }
  return obj;
};

// ── Permissions virtual ───────────────────────────────────────────────────────
userSchema.virtual("permissions").get(function () {
  const isAdmin = this.role === "admin";
  return {
    viewProducts:       true,
    updateProductStock: true,
    addDeleteProducts:  isAdmin,
    generateBills:      true,
    manageStaff:        isAdmin,
    viewInventoryValue: isAdmin,
    manageSettings:     isAdmin,  // NEW
  };
});

userSchema.set("toJSON",   { virtuals: true });
userSchema.set("toObject", { virtuals: true });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);