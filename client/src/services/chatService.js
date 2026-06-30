/**
 * chatService.js  (v2)
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-side wrapper around /api/chat endpoints.
 * Uses the shared axios instance (JWT auto-attached).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import API from "../api/axios";

/** Send a message and get an AI reply. */
export async function sendChatMessage({ message, sessionId = null }) {
  const { data } = await API.post("/api/chat/message", { message, sessionId });
  return data;
}

/** Fetch all sessions for the current user (newest first). */
export async function getSessions() {
  const { data } = await API.get("/api/chat/sessions");
  return data.data;
}

/** Load full message history for a session. */
export async function getSessionHistory(sessionId) {
  const { data } = await API.get(`/api/chat/sessions/${sessionId}`);
  return data.data;
}

/** Delete a specific session. */
export async function deleteSession(sessionId) {
  const { data } = await API.delete(`/api/chat/sessions/${sessionId}`);
  return data;
}

/** Clear all sessions for the current user. */
export async function clearAllSessions() {
  const { data } = await API.delete("/api/chat/sessions");
  return data;
}

/**
 * Fetch the current user's chatbot permission profile.
 * Returns { role, permissions: { canSeeStaffList, canSeeBillingData, ... } }
 */
export async function getMyPermissions() {
  const { data } = await API.get("/api/chat/permissions");
  return data.data;
}

/** Admin only: fetch AI audit log. */
export async function getAuditLog() {
  const { data } = await API.get("/api/chat/audit");
  return data.data;
}
