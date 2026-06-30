/**
 * chatbot.controller.js  (v2 — role-aware)
 * ─────────────────────────────────────────────────────────────────────────────
 * All handlers receive req.user (from authUser) and req.chatPerms
 * (from attachChatPermissions). Role enforcement happens in gemini.service
 * and contextBuilder — the controller just orchestrates.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use strict";

const { ChatSession, ChatAudit } = require("../models/chatMessage.model");
const geminiService               = require("../services/gemini.service");
const { logActivity }             = require("../utils/activityLogger");

const MAX_SESSION_MESSAGES = 100; // rolling window

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTitle(text) {
  return text.replace(/\s+/g, " ").trim().slice(0, 60) + (text.length > 60 ? "…" : "");
}

function safeErrorMsg(err) {
  // Never leak internal error details to clients
  if (err.code === "INVALID_INPUT")    return "Please provide a valid message (non-empty, under 2000 characters).";
  if (err.code === "PROMPT_INJECTION") return "Invalid input detected. Please rephrase your question.";
  return "AI service temporarily unavailable. Please try again in a moment.";
}

// ── POST /api/chat/message ────────────────────────────────────────────────────

const sendMessage = async (req, res) => {
  const { message, sessionId } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ success: false, message: "Message is required." });
  }

  const {
    _id: userId,
    name: userName,
    companyCode,
    role,
  } = req.user;

  let session;

  try {
    // ── 1. Input sanitization (throws on injection) ───────────────────────
    let safeMessage;
    try {
      safeMessage = geminiService.sanitizeInput(message);
    } catch (err) {
      return res.status(400).json({ success: false, message: safeErrorMsg(err) });
    }

    // ── 2. Load or create session ─────────────────────────────────────────
    if (sessionId) {
      session = await ChatSession.findOne({ _id: sessionId, userId, companyCode });
    }
    if (!session) {
      session = new ChatSession({
        userId,
        companyCode,
        userRole:     role,
        sessionTitle: makeTitle(safeMessage),
        messages:     [],
        messageCount: 0,
      });
    }

    // ── 3. Call Gemini with role-scoped context ────────────────────────────
    const result = await geminiService.chat({
      companyCode,
      role,
      userId:      userId.toString(),
      userName,
      history:     session.messages,
      userMessage: safeMessage,
    });

    const { text, tokensUsed, contextSnapshot, latencyMs, wasBlocked } = result;

    // ── 4. Persist turn to session ────────────────────────────────────────
    const now = new Date();
    session.messages.push({ role: "user",      content: safeMessage, timestamp: now });
    session.messages.push({ role: "assistant", content: text,        timestamp: now });

    // Rolling window
    if (session.messages.length > MAX_SESSION_MESSAGES) {
      session.messages = session.messages.slice(-MAX_SESSION_MESSAGES);
    }

    session.messageCount  = session.messages.length;
    session.lastActiveAt  = now;
    await session.save();

    // ── 5. Audit log (async, non-blocking) ───────────────────────────────
    ChatAudit.create({
      userId,
      userName,
      userRole:        role,
      companyCode,
      sessionId:       session._id,
      question:        safeMessage,
      answer:          text,
      wasBlocked,
      contextSnapshot: role === "admin" ? contextSnapshot : {},  // no PII in staff audit
      tokensUsed,
      latencyMs,
    }).catch(e => console.error("[ChatAudit] write failed:", e.message));

    // ── 6. Activity log (async, non-blocking) ────────────────────────────
    logActivity({
      userId,
      userName,
      role,
      companyCode,
      action:  "CHAT_QUERY",
      entity:  "ChatBot",
      message: `Asked: "${safeMessage.slice(0, 80)}${safeMessage.length > 80 ? "…" : ""}"`,
    }).catch(() => {});

    // ── 7. Real-time emit (Socket.IO) ────────────────────────────────────
    const io = req.app.get("io");
    if (io) {
      // Emit only to the specific user's socket room, not company-wide,
      // since chat responses are private.
      io.to(`user:${userId}`).emit("chat:reply", {
        sessionId:    session._id,
        role:         "assistant",
        content:      text,
        wasBlocked,
        timestamp:    now,
      });
    }

    return res.json({
      success: true,
      data: {
        sessionId:    session._id,
        sessionTitle: session.sessionTitle,
        reply:        text,
        wasBlocked,
        tokensUsed,
        latencyMs,
      },
    });

  } catch (err) {
    console.error("[Chatbot] sendMessage error:", err.message);
    return res.status(500).json({ success: false, message: safeErrorMsg(err) });
  }
};

// ── GET /api/chat/sessions ────────────────────────────────────────────────────

const getSessions = async (req, res) => {
  const { _id: userId, companyCode } = req.user;
  try {
    const sessions = await ChatSession.find({ userId, companyCode })
      .sort({ lastActiveAt: -1 })
      .limit(25)
      .select("_id sessionTitle messageCount lastActiveAt createdAt userRole")
      .lean();

    return res.json({ success: true, data: sessions });
  } catch (err) {
    console.error("[Chatbot] getSessions error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to load sessions." });
  }
};

// ── GET /api/chat/sessions/:sessionId ────────────────────────────────────────

const getSessionHistory = async (req, res) => {
  const { sessionId }              = req.params;
  const { _id: userId, companyCode } = req.user;

  try {
    const session = await ChatSession.findOne({ _id: sessionId, userId, companyCode })
      .select("messages sessionTitle lastActiveAt userRole")
      .lean();

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found." });
    }

    return res.json({ success: true, data: session });
  } catch (err) {
    console.error("[Chatbot] getSessionHistory error:", err.message);
    return res.status(500).json({ success: false, message: "Failed to load history." });
  }
};

// ── DELETE /api/chat/sessions/:sessionId ──────────────────────────────────────

const deleteSession = async (req, res) => {
  const { sessionId }              = req.params;
  const { _id: userId, companyCode } = req.user;

  try {
    const result = await ChatSession.deleteOne({ _id: sessionId, userId, companyCode });
    if (!result.deletedCount) {
      return res.status(404).json({ success: false, message: "Session not found." });
    }
    return res.json({ success: true, message: "Session deleted." });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to delete session." });
  }
};

// ── DELETE /api/chat/sessions ─────────────────────────────────────────────────

const clearAllSessions = async (req, res) => {
  const { _id: userId, companyCode } = req.user;
  try {
    await ChatSession.deleteMany({ userId, companyCode });
    return res.json({ success: true, message: "All sessions cleared." });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to clear sessions." });
  }
};

// ── GET /api/chat/audit  (admin only) ────────────────────────────────────────

const getAuditLog = async (req, res) => {
  const { companyCode, role } = req.user;

  if (role !== "admin") {
    return res.status(403).json({ success: false, message: "Admin access required." });
  }

  try {
    const logs = await ChatAudit.find({ companyCode })
      .sort({ createdAt: -1 })
      .limit(100)
      .select("userName userRole question answer wasBlocked tokensUsed latencyMs createdAt")
      .lean();

    return res.json({ success: true, data: logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to load audit log." });
  }
};

// ── GET /api/chat/permissions ─────────────────────────────────────────────────
// Returns the current user's chatbot capabilities (for UI to conditionally render)

const getMyPermissions = async (req, res) => {
  const perms = req.chatPerms;
  const role  = req.user.role;
  return res.json({ success: true, data: { role, permissions: perms } });
};

module.exports = {
  sendMessage,
  getSessions,
  getSessionHistory,
  deleteSession,
  clearAllSessions,
  getAuditLog,
  getMyPermissions,
};
