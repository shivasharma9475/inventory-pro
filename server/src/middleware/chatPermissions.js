/**
 * chatPermissions.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for what each role can see in the AI chatbot.
 * Security is enforced HERE in Node.js — never delegated to the AI model.
 *
 * Architecture principle:
 *   1. We build SEPARATE context objects per role in the context builder.
 *   2. This file declares which data categories each role can access.
 *   3. The permission guard middleware validates intent before hitting Gemini.
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use strict";

// ── Capability flags per role ─────────────────────────────────────────────────
const ROLE_PERMISSIONS = {
  admin: {
    canSeeProducts:         true,
    canSeeInventoryStats:   true,
    canSeeBillingData:      true,
    canSeeSalesAnalytics:   true,
    canSeeStaffList:        true,       // names + designations only
    canSeeStaffActivity:    true,
    canSeeAuditLog:         true,
    canSeeUserCounts:       true,
    canSeeDashboardStats:   true,
    canSeeCompanySettings:  true,
    maxRecentBills:         100,
    maxRecentActivities:    50,
  },

  staff: {
    canSeeProducts:         true,
    canSeeInventoryStats:   true,
    canSeeBillingData:      true,       // summary only, no buyer PII
    canSeeSalesAnalytics:   false,      // no revenue breakdowns
    canSeeStaffList:        false,      // ← hard block
    canSeeStaffActivity:    false,      // ← hard block
    canSeeAuditLog:         false,      // ← hard block
    canSeeUserCounts:       false,      // ← hard block
    canSeeDashboardStats:   false,      // ← no internal analytics
    canSeeCompanySettings:  false,
    maxRecentBills:         10,         // limited window
    maxRecentActivities:    20,         // only own activity (filtered server-side)
  },
};

/**
 * Get permissions object for a role.
 * Defaults to the most restrictive (staff) if role is unknown.
 */
function getPermissions(role) {
  return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.staff;
}

/**
 * Express middleware — gates access to chat endpoints based on role.
 * Attaches `req.chatPerms` for downstream use in controller + context builder.
 */
function attachChatPermissions(req, res, next) {
  const role = req.user?.role ?? "staff";
  req.chatPerms = getPermissions(role);
  next();
}

// ── Blocked-topic classifier ──────────────────────────────────────────────────
// Patterns that indicate a staff user is asking for restricted data.
// This is defence-in-depth — context is already stripped, but we surface
// a clean refusal message rather than a confusing "I don't know" response.

const STAFF_BLOCKED_TOPICS = [
  // Staff roster
  /\b(staff|employee|worker|team member)s?\b.*(list|names?|who|all|our)/i,
  /who\s+(are|is)\s+(our|the)\s+(staff|employee|team)/i,
  /list\s+(all\s+)?(staff|employee|team)/i,
  /show\s+(me\s+)?(all\s+)?(staff|employee)/i,

  // Contact / PII
  /staff\s+(email|phone|contact|number|salary|pay)/i,
  /email.*(staff|employee)/i,

  // Admin / audit
  /audit\s*log/i,
  /\badmin\b.*(info|detail|data|access)/i,
  /user\s*(account|count|statistic)/i,
  /company\s*setting/i,
  /internal\s*analytic/i,
  /revenue\s*(breakdown|detail|report)/i,
  /financial\s*(detail|report|data)/i,
];

/**
 * Returns true if a staff user's message is touching a restricted topic.
 * @param {string} message
 * @param {string} role
 */
function isRestrictedRequest(message, role) {
  if (role === "admin") return false; // admins have no blocked topics
  return STAFF_BLOCKED_TOPICS.some(pattern => pattern.test(message));
}

const PERMISSION_DENIED_MSG =
  "Sorry, you don't have permission to access that information. " +
  "Please contact your administrator if you need help with this.";

module.exports = {
  ROLE_PERMISSIONS,
  getPermissions,
  attachChatPermissions,
  isRestrictedRequest,
  PERMISSION_DENIED_MSG,
};
