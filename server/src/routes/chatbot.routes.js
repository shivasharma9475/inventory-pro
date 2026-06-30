/**
 * chatbot.routes.js  (v2)
 * ─────────────────────────────────────────────────────────────────────────────
 * Route-level security layers (innermost-first):
 *   1. authUser          — validates JWT, attaches req.user
 *   2. attachChatPerms   — derives req.chatPerms from req.user.role
 *   3. chatRateLimit     — 30 AI calls / 15 min per user
 *   4. express-validator — validates body/param shapes
 *   5. controller        — business logic
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use strict";

const express   = require("express");
const {rateLimit , ipKeyGenerator} = require("express-rate-limit");
const { body, param, validationResult } = require("express-validator");

const { authUser }              = require("../middleware/auth.middleware");
const { attachChatPermissions } = require("../middleware/chatPermissions");
const ctrl                      = require("../controllers/chatbot.controller");

const router = express.Router();

// ── Per-user rate limiter ─────────────────────────────────────────────────────
const chatRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,

  keyGenerator: (req) => {
    return req.user?._id?.toString() || ipKeyGenerator(req);
  },

  skip: (req) => req.method === "OPTIONS",

  message: {
    success: false,
    message:
      "You've sent too many messages. Please wait a moment before trying again.",
  },
});

// ── Validation helper ─────────────────────────────────────────────────────────
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: errors.array()[0].msg });
  }
  next();
}

// ── Shared middleware stack (auth + perms) ────────────────────────────────────
const auth = [authUser, attachChatPermissions];

// ── Routes ────────────────────────────────────────────────────────────────────

// Send a message → AI response
router.post(
  "/message",
  ...auth,
  chatRateLimit,
  [
    body("message")
      .isString()
      .trim()
      .notEmpty().withMessage("Message cannot be empty.")
      .isLength({ max: 2000 }).withMessage("Message is too long (max 2000 characters)."),
    body("sessionId")
      .optional({ nullable: true })
      .isMongoId().withMessage("Invalid sessionId format."),
  ],
  validate,
  ctrl.sendMessage
);

// List sessions for the authenticated user
router.get("/sessions",      ...auth, ctrl.getSessions);

// Load a specific session's message history
router.get(
  "/sessions/:sessionId",
  ...auth,
  [param("sessionId").isMongoId().withMessage("Invalid sessionId.")],
  validate,
  ctrl.getSessionHistory
);

// Delete a specific session
router.delete(
  "/sessions/:sessionId",
  ...auth,
  [param("sessionId").isMongoId().withMessage("Invalid sessionId.")],
  validate,
  ctrl.deleteSession
);

// Clear all sessions for the user
router.delete("/sessions", ...auth, ctrl.clearAllSessions);

// Admin: AI audit log (role guard is inside the controller)
router.get("/audit", ...auth, ctrl.getAuditLog);

// Get current user's chatbot permissions (for frontend conditional rendering)
router.get("/permissions", ...auth, ctrl.getMyPermissions);

module.exports = router;
