const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
{
// ── User Info ─────────────────────────────
userId: {
type: mongoose.Schema.Types.ObjectId,
ref: "User",
required: true,
},

userName: {
  type: String,
  required: true,
  trim: true,
},

role: {
  type: String,
  enum: ["admin", "staff"],
  default: "staff",
},

// ── Company Isolation ─────────────────────
companyCode: {
  type: String,
  required: true,
  index: true,
},

// ── Activity Info ─────────────────────────
action: {
  type: String,
  required: true,
  trim: true,
  uppercase: true,
},

entity: {
  type: String,
  required: true,
  trim: true,
  uppercase: true,
},

entityId: {
  type: mongoose.Schema.Types.ObjectId,
  required: false,
},

// ── Human Readable Message ────────────────
message: {
  type: String,
  required: true,
  trim: true,
},

// ── Extra Metadata ────────────────────────
details: {
  type: mongoose.Schema.Types.Mixed,
  default: {},
},

// ── Request Tracking ──────────────────────
ipAddress: {
  type: String,
  default: "",
},

userAgent: {
  type: String,
  default: "",
},

createdAt: {
  type: Date,
  default: Date.now,
  expires: "7d",
},

},
{
timestamps: true,
}
);

// ── Indexes for fast activity feed ───────────
activitySchema.index({ companyCode: 1, createdAt: -1 });

activitySchema.index({
companyCode: 1,
action: 1,
});

activitySchema.index({
companyCode: 1,
entity: 1,
});

// ── Optional virtual for formatted date ──────
activitySchema.virtual("timeAgo").get(function () {
const diff = Date.now() - this.createdAt.getTime();

const mins = Math.floor(diff / 60000);

if (mins < 1) return "Just now";
if (mins < 60) return `${mins} min ago`;

const hours = Math.floor(mins / 60);

if (hours < 24) return `${hours} hr ago`;

const days = Math.floor(hours / 24);

return `${days} day ago`;
});

activitySchema.set("toJSON", { virtuals: true });
activitySchema.set("toObject", { virtuals: true });

module.exports =
mongoose.models.Activity ||
mongoose.model("Activity", activitySchema);
