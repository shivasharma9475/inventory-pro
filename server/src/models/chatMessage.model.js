/**
 * chatMessage.model.js  (v2)
 * ─────────────────────────────────────────────────────────────────────────────
 * ChatSession  — stores per-user conversation history
 * ChatAudit    — immutable audit log of every AI exchange
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use strict";

const mongoose = require("mongoose");

// ── Individual message turn ───────────────────────────────────────────────────
const MessageSchema = new mongoose.Schema(
  {
    role: {
      type:     String,
      enum:     ["user", "assistant"],
      required: true,
    },
    content: {
      type:      String,
      required:  true,
      maxlength: 8000,
    },
    timestamp: {
      type:    Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// ── Chat session (one per conversation thread) ────────────────────────────────
const ChatSessionSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
      index:    true,
    },
    companyCode: {
      type:     String,
      required: true,
      index:    true,
    },
    // Role at time of session creation (for display in admin audit views)
    userRole: {
      type:    String,
      enum:    ["admin", "staff"],
      default: "staff",
    },
    sessionTitle: {
      type:     String,
      default:  "New Conversation",
      maxlength: 120,
    },
    messages: {
      type:    [MessageSchema],
      default: [],
    },
    messageCount: {
      type:    Number,
      default: 0,
    },
    lastActiveAt: {
      type:    Date,
      default: Date.now,
      
    },
  },
  { timestamps: true }
);

// TTL: auto-delete sessions idle for 30 days
ChatSessionSchema.index({ lastActiveAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
// Query: list a user's sessions newest-first
ChatSessionSchema.index({ userId: 1, lastActiveAt: -1 });
// Query: company-wide admin view
ChatSessionSchema.index({ companyCode: 1, lastActiveAt: -1 });

// ── Audit log (one record per AI exchange) ────────────────────────────────────
const ChatAuditSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      "User",
      required: true,
    },
    userName:    { type: String, required: true },
    userRole:    { type: String, enum: ["admin", "staff"], required: true },
    companyCode: { type: String, required: true, index: true },
    sessionId:   { type: mongoose.Schema.Types.ObjectId, ref: "ChatSession" },

    question: { type: String, required: true },
    answer:   { type: String, required: true },

    // True when the request was blocked by role-based guard (before hitting Gemini)
    wasBlocked: { type: Boolean, default: false },

    // Inventory snapshot at time of query (admin only — staff snapshot is empty)
    contextSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },

    tokensUsed: { type: Number, default: 0 },
    latencyMs:  { type: Number, default: 0 },
  },
  { timestamps: true }
);

ChatAuditSchema.index({ companyCode: 1, createdAt: -1 });
ChatAuditSchema.index({ userId: 1, createdAt: -1 });
// TTL: auto-delete audit records after 90 days
ChatAuditSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

// ── Exports ───────────────────────────────────────────────────────────────────
const ChatSession =
  mongoose.models.ChatSession ?? mongoose.model("ChatSession", ChatSessionSchema);

const ChatAudit =
  mongoose.models.ChatAudit ?? mongoose.model("ChatAudit", ChatAuditSchema);

module.exports = { ChatSession, ChatAudit };
