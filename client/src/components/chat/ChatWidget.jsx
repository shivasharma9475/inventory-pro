/**
 * ChatWidget.jsx  (v2 — role-aware)
 * ─────────────────────────────────────────────────────────────────────────────
 * Floating chat widget with:
 *   • Role-aware suggested prompts (admin sees staff + analytics prompts)
 *   • Blocked-message UI (permission denied styling)
 *   • Session history drawer
 *   • Typing indicator + auto-scroll
 *   • Socket.IO real-time message receipt
 *   • Admin badge in header
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  sendChatMessage,
  getSessions,
  getSessionHistory,
  deleteSession,
  getMyPermissions,
} from "../../services/chatService";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:          "#0d0d12",
  surface:     "#14141c",
  surface2:    "#1a1a24",
  surface3:    "#20202c",
  border:      "rgba(255,255,255,0.06)",
  border2:     "rgba(255,255,255,0.11)",
  text1:       "#efeff5",
  text2:       "rgba(255,255,255,0.52)",
  text3:       "rgba(255,255,255,0.26)",
  accent:      "#7c6ff7",
  accentGlow:  "rgba(124,111,247,0.18)",
  accentHover: "#6a5fe3",
  green:       "#34d399",
  red:         "#f87171",
  amber:       "#fbbf24",
  adminGold:   "#f59e0b",
};

// ── Role-specific suggested prompts ──────────────────────────────────────────
const SUGGESTIONS = {
  admin: [
    "Show low stock products",
    "What are today's total sales?",
    "Who are our staff members?",
    "Which products are out of stock?",
    "Show top selling products",
    "What's our total inventory value?",
    "Show recent staff activity",
    "Give me a sales revenue summary",
  ],
  staff: [
    "Show low stock products",
    "Which products need restocking?",
    "What are today's sales?",
    "Show all product categories",
    "Which products are out of stock?",
    "What's our total stock count?",
  ],
};

// ── Markdown-lite renderer ────────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return null;
  return text.split("\n").map((line, i) => {
    const boldified = line.split(/\*\*(.*?)\*\*/g).map((chunk, j) =>
      j % 2 === 1
        ? <strong key={j} style={{ color: C.text1, fontWeight: 600 }}>{chunk}</strong>
        : chunk
    );
    const isBullet = /^[-•]\s/.test(line);
    const isH2     = line.startsWith("## ");
    const isH3     = line.startsWith("### ");

    if (isH2) return (
      <div key={i} style={{ color: C.accent, fontWeight: 600, fontSize: 12, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 10, marginBottom: 4 }}>
        {line.replace(/^##\s+/, "")}
      </div>
    );
    if (isH3) return (
      <div key={i} style={{ color: C.text1, fontWeight: 600, fontSize: 13, marginTop: 8, marginBottom: 2 }}>
        {line.replace(/^###\s+/, "")}
      </div>
    );
    return (
      <div key={i} style={{ display: "flex", gap: isBullet ? 6 : 0, marginBottom: isBullet ? 2 : 0, paddingLeft: isBullet ? 2 : 0 }}>
        {isBullet && <span style={{ color: C.accent, flexShrink: 0, marginTop: 1 }}>•</span>}
        <span>{isBullet ? boldified.slice(1) : boldified}</span>
      </div>
    );
  });
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "2px 0" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: "50%", background: C.accent, display: "inline-block",
          animation: `chatDot 1.3s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ── Permission-denied message bubble ─────────────────────────────────────────
function BlockedBubble({ content }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8,
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
        background: "linear-gradient(135deg, #f59e0b, #ef4444)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 3.5v4m0 2v.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
      <div style={{
        padding: "9px 13px",
        background: "rgba(245,158,11,0.08)",
        border: `0.5px solid rgba(245,158,11,0.3)`,
        borderRadius: "14px 14px 14px 4px",
        color: C.amber,
        fontSize: 13,
        lineHeight: 1.5,
        maxWidth: "82%",
      }}>
        {content}
      </div>
    </div>
  );
}

// ── Format time ───────────────────────────────────────────────────────────────
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

export default function ChatWidget({ socket }) {
  const [open, setOpen]               = useState(false);
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [sessionId, setSessionId]     = useState(null);
  const [sessions, setSessions]       = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError]             = useState(null);
  const [unread, setUnread]           = useState(0);
  const [perms, setPerms]             = useState(null);   // { role, permissions }

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  const isAdmin = perms?.role === "admin";

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Focus on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  // ── Load permissions on mount ─────────────────────────────────────────────
  useEffect(() => {
    getMyPermissions().then(setPerms).catch(() => {});
  }, []);

  // ── Load sessions on first open ───────────────────────────────────────────
  useEffect(() => {
    if (open && sessions.length === 0) {
      getSessions().then(setSessions).catch(() => {});
    }
  }, [open]);

  // ── Welcome message ───────────────────────────────────────────────────────
  useEffect(() => {
    if (open && messages.length === 0 && perms) {
      const greeting = isAdmin
        ? "Hi! I'm **InventoryBot** 👋\n\nAs an **Administrator**, you have full access to inventory, sales, staff data, and analytics. What would you like to know?"
        : "Hi! I'm **InventoryBot** 👋\n\nI can help you with product stock, low-stock alerts, categories, and sales summaries. What would you like to check?";
      setMessages([{
        id:        "welcome",
        role:      "assistant",
        content:   greeting,
        timestamp: new Date(),
      }]);
    }
  }, [open, perms]);

  // ── Socket.IO: receive real-time replies ──────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      if (data.sessionId?.toString() !== sessionId?.toString()) return;
      // Only add if not already present (the HTTP response adds it first)
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last.content === data.content) return prev;
        return prev;
      });
      if (!open) setUnread(u => u + 1);
    };
    socket.on("chat:reply", handler);
    return () => socket.off("chat:reply", handler);
  }, [socket, sessionId, open]);

  // ── Send message ──────────────────────────────────────────────────────────
  const send = useCallback(async (overrideText) => {
    const msg = (overrideText ?? input).trim();
    if (!msg || loading) return;

    setInput("");
    setError(null);

    const userMsg = { id: `u-${Date.now()}`, role: "user", content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await sendChatMessage({ message: msg, sessionId });
      const { reply, sessionId: sid, sessionTitle, wasBlocked } = res.data;

      setSessionId(sid);

      const botMsg = {
        id:        `a-${Date.now()}`,
        role:      "assistant",
        content:   reply,
        timestamp: new Date(),
        wasBlocked,
      };
      setMessages(prev => [...prev, botMsg]);

      // Update sessions list
      setSessions(prev => {
        const exists = prev.find(s => s._id === sid);
        if (exists) return prev.map(s => s._id === sid
          ? { ...s, lastActiveAt: new Date(), messageCount: s.messageCount + 2 }
          : s);
        return [{ _id: sid, sessionTitle, messageCount: 2, lastActiveAt: new Date(), userRole: perms?.role }, ...prev];
      });

    } catch (err) {
      const msg = err.response?.data?.message || "Failed to get a response. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, loading, sessionId, perms]);

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // ── Load past session ─────────────────────────────────────────────────────
  const loadSession = async (sid) => {
    try {
      const data = await getSessionHistory(sid);
      setSessionId(sid);
      setMessages(data.messages.map((m, i) => ({ ...m, id: `h-${i}` })));
      setShowHistory(false);
    } catch { setError("Failed to load session."); }
  };

  // ── New chat ──────────────────────────────────────────────────────────────
  const newChat = () => {
    setSessionId(null);
    setError(null);
    setShowHistory(false);
    setMessages([{
      id:        "welcome-new",
      role:      "assistant",
      content:   "Starting a new conversation. What would you like to know?",
      timestamp: new Date(),
    }]);
  };

  // ── Delete session ────────────────────────────────────────────────────────
  const removeSession = async (e, sid) => {
    e.stopPropagation();
    await deleteSession(sid).catch(() => {});
    setSessions(prev => prev.filter(s => s._id !== sid));
    if (sid === sessionId) newChat();
  };

  const suggestions = isAdmin ? SUGGESTIONS.admin : SUGGESTIONS.staff;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Keyframes */}
      <style>{`
        @keyframes chatDot { 0%,80%,100% { transform: translateY(0); opacity:0.35; } 40% { transform: translateY(-5px); opacity:1; } }
        @keyframes chatSlideIn { from { opacity:0; transform:translateY(14px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes chatPulse { 0%,100% { box-shadow:0 0 0 0 rgba(124,111,247,0.5); } 50% { box-shadow:0 0 0 9px rgba(124,111,247,0); } }
        .cwMsg:hover .cwTs { opacity:1 !important; }
        .cwSess:hover { background: rgba(124,111,247,0.07) !important; }
        .cwChip:hover { background: rgba(124,111,247,0.13) !important; border-color: rgba(124,111,247,0.4) !important; }
      `}</style>

      {/* ── FAB ─────────────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        title="InventoryBot AI Assistant"
        style={{
          position: "fixed", bottom: 24, right: 24,
          width: 52, height: 52, borderRadius: "50%",
          background: "linear-gradient(135deg, #7c6ff7, #60a5fa)",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 24px rgba(124,111,247,0.4)",
          zIndex: 9999,
          animation: !open ? "chatPulse 2.8s ease-in-out infinite" : "none",
          transition: "transform 0.22s cubic-bezier(.34,1.56,.64,1)",
          transform: open ? "rotate(180deg) scale(1.05)" : "rotate(0deg) scale(1)",
        }}
      >
        {open
          ? <svg width="17" height="17" viewBox="0 0 18 18" fill="none"><path d="M4 4l10 10M14 4L4 14" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>
          : <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="white" opacity="0.9"/><circle cx="8.5" cy="11" r="1.2" fill="#7c6ff7"/><circle cx="12" cy="11" r="1.2" fill="#7c6ff7"/><circle cx="15.5" cy="11" r="1.2" fill="#7c6ff7"/></svg>
        }
        {!open && unread > 0 && (
          <span style={{
            position: "absolute", top: -3, right: -3,
            background: C.red, color: "#fff", fontSize: 9, fontWeight: 700,
            borderRadius: 8, padding: "1px 5px", minWidth: 16, textAlign: "center",
          }}>{unread}</span>
        )}
      </button>

      {/* ── Chat Panel ──────────────────────────────────────────────────── */}
      {open && (
        <div style={{
          position: "fixed", bottom: 88, right: 24,
          width: "min(430px, calc(100vw - 32px))",
          height: "min(610px, calc(100vh - 120px))",
          background: C.bg,
          border: `0.5px solid ${C.border2}`,
          borderRadius: 18,
          boxShadow: "0 28px 90px rgba(0,0,0,0.65), 0 0 0 0.5px rgba(255,255,255,0.03)",
          zIndex: 9998,
          display: "flex", flexDirection: "column", overflow: "hidden",
          animation: "chatSlideIn 0.22s ease",
        }}>

          {/* ── Header ────────────────────────────────────────────────── */}
          <div style={{
            padding: "13px 14px",
            borderBottom: `0.5px solid ${C.border}`,
            display: "flex", alignItems: "center", gap: 10,
            background: C.surface, flexShrink: 0,
          }}>
            {/* Bot avatar */}
            <div style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #7c6ff7, #60a5fa)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 12px rgba(124,111,247,0.35)",
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <rect x="4" y="8" width="16" height="12" rx="3" fill="white" opacity="0.15"/>
                <path d="M9 8V6a3 3 0 016 0v2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="9" cy="14" r="1.5" fill="white"/>
                <circle cx="15" cy="14" r="1.5" fill="white"/>
                <path d="M9 17.5c.8.8 5.2.8 6 0" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ color: C.text1, fontSize: 13, fontWeight: 600 }}>InventoryBot</span>
                {isAdmin && (
                  <span style={{
                    background: "rgba(245,158,11,0.15)", border: "0.5px solid rgba(245,158,11,0.4)",
                    color: C.adminGold, fontSize: 9, fontWeight: 700,
                    padding: "1px 6px", borderRadius: 4, letterSpacing: "0.06em", textTransform: "uppercase",
                  }}>Admin</span>
                )}
              </div>
              <div style={{ color: C.green, fontSize: 10, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.green, display: "inline-block" }}/>
                Live inventory data
              </div>
            </div>

            {/* History button */}
            <button onClick={() => setShowHistory(h => !h)} title="History"
              style={{
                width: 28, height: 28, borderRadius: 7, cursor: "pointer",
                background: showHistory ? C.accentGlow : "rgba(255,255,255,0.04)",
                border: `0.5px solid ${showHistory ? C.accent : C.border}`,
                color: showHistory ? C.accent : C.text3,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M8 4.5V8l2.5 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </button>

            {/* New chat */}
            <button onClick={newChat} title="New conversation"
              style={{
                width: 28, height: 28, borderRadius: 7, cursor: "pointer",
                background: "rgba(255,255,255,0.04)", border: `0.5px solid ${C.border}`,
                color: C.text3, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M8 2.5v11M2.5 8h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          {/* ── History Drawer ─────────────────────────────────────────── */}
          {showHistory && (
            <div style={{
              background: C.surface, borderBottom: `0.5px solid ${C.border}`,
              maxHeight: 210, overflowY: "auto", flexShrink: 0,
            }}>
              {sessions.length === 0
                ? <div style={{ color: C.text3, fontSize: 12, padding: "12px 16px" }}>No previous conversations</div>
                : sessions.map(s => (
                  <div key={s._id} className="cwSess"
                    onClick={() => loadSession(s._id)}
                    style={{
                      padding: "9px 14px", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 8,
                      borderBottom: `0.5px solid ${C.border}`,
                      background: s._id === sessionId ? C.accentGlow : "transparent",
                      transition: "background 0.12s",
                    }}>
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: C.text3 }}>
                      <path d="M13 1H3a1 1 0 00-1 1v9a1 1 0 001 1h2l3 3 3-3h2a1 1 0 001-1V2a1 1 0 00-1-1z" stroke="currentColor" strokeWidth="1.2"/>
                    </svg>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: C.text1, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.sessionTitle}
                      </div>
                      <div style={{ color: C.text3, fontSize: 10 }}>
                        {s.messageCount} msgs · {new Date(s.lastActiveAt).toLocaleDateString("en-IN")}
                        {s.userRole === "admin" && (
                          <span style={{ color: C.adminGold, marginLeft: 5 }}>· admin</span>
                        )}
                      </div>
                    </div>
                    <button onClick={e => removeSession(e, s._id)}
                      style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", fontSize: 15, padding: 2, lineHeight: 1 }}>×</button>
                  </div>
                ))
              }
            </div>
          )}

          {/* ── Messages ──────────────────────────────────────────────── */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "16px 14px",
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            {messages.map(msg => {
              if (msg.role === "assistant" && msg.wasBlocked) {
                return <BlockedBubble key={msg.id} content={msg.content} />;
              }

              return (
                <div key={msg.id} className="cwMsg"
                  style={{
                    display: "flex",
                    flexDirection: msg.role === "user" ? "row-reverse" : "row",
                    gap: 8, alignItems: "flex-end",
                  }}>
                  {/* Bot avatar */}
                  {msg.role === "assistant" && (
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg, #7c6ff7, #60a5fa)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <rect x="4" y="8" width="16" height="12" rx="3" fill="white" opacity="0.2"/>
                        <path d="M9 8V6a3 3 0 016 0v2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                        <circle cx="9" cy="14" r="1.2" fill="white"/>
                        <circle cx="15" cy="14" r="1.2" fill="white"/>
                      </svg>
                    </div>
                  )}

                  <div style={{ maxWidth: "82%", display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", gap: 3 }}>
                    <div style={{
                      padding: "9px 13px",
                      borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: msg.role === "user"
                        ? "linear-gradient(135deg, #7c6ff7, #5a55d0)"
                        : C.surface2,
                      border: `0.5px solid ${msg.role === "user" ? "transparent" : C.border}`,
                      color: C.text1, fontSize: 13, lineHeight: 1.58, wordBreak: "break-word",
                    }}>
                      {msg.role === "assistant" ? renderMarkdown(msg.content) : msg.content}
                    </div>
                    <span className="cwTs"
                      style={{ fontSize: 10, color: C.text3, opacity: 0, transition: "opacity 0.2s", paddingInline: 4 }}>
                      {fmtTime(msg.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Typing */}
            {loading && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{
                  width: 26, height: 26, borderRadius: "50%",
                  background: "linear-gradient(135deg, #7c6ff7, #60a5fa)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><rect x="4" y="8" width="16" height="12" rx="3" fill="white" opacity="0.2"/></svg>
                </div>
                <div style={{
                  padding: "10px 14px", background: C.surface2,
                  border: `0.5px solid ${C.border}`, borderRadius: "16px 16px 16px 4px",
                }}>
                  <TypingDots />
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                padding: "9px 13px",
                background: "rgba(248,113,113,0.07)",
                border: `0.5px solid rgba(248,113,113,0.25)`,
                borderRadius: 10, color: C.red, fontSize: 12,
                display: "flex", gap: 7, alignItems: "center",
              }}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M8 5v3M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            {/* Suggestion chips — shown on fresh sessions */}
            {messages.length <= 1 && !loading && (
              <div style={{ marginTop: 6 }}>
                <div style={{ color: C.text3, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                  {isAdmin ? "Admin quick queries" : "Try asking"}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {suggestions.map(s => (
                    <button key={s} className="cwChip" onClick={() => send(s)}
                      style={{
                        background: C.surface2,
                        border: `0.5px solid ${C.border2}`,
                        borderRadius: 20, color: C.text2, fontSize: 11,
                        padding: "5px 11px", cursor: "pointer",
                        transition: "all 0.14s", whiteSpace: "nowrap",
                      }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── Input ─────────────────────────────────────────────────── */}
          <div style={{
            padding: "11px 13px",
            borderTop: `0.5px solid ${C.border}`,
            background: C.surface, flexShrink: 0,
          }}>
            <div style={{
              display: "flex", gap: 8, alignItems: "flex-end",
              background: C.surface2,
              border: `0.5px solid ${C.border2}`,
              borderRadius: 12, padding: "8px 10px",
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={isAdmin
                  ? "Ask about inventory, staff, sales, analytics…"
                  : "Ask about products, stock, categories…"}
                rows={1}
                disabled={loading}
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  color: C.text1, fontSize: 13, lineHeight: 1.5,
                  resize: "none", fontFamily: "inherit",
                  maxHeight: 100, overflowY: "auto", scrollbarWidth: "none",
                }}
                onInput={e => {
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + "px";
                }}
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || loading}
                style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: !input.trim() || loading ? "rgba(124,111,247,0.18)" : C.accent,
                  border: "none",
                  cursor: !input.trim() || loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                  opacity: !input.trim() || loading ? 0.5 : 1,
                }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M14 8L2 2.5l2.5 5.5-2.5 5.5L14 8z" fill="white"/>
                </svg>
              </button>
            </div>

            {/* Role indicator footer */}
            <div style={{
              color: C.text3, fontSize: 10, textAlign: "center", marginTop: 7,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: "50%",
                background: isAdmin ? C.adminGold : C.green,
                display: "inline-block", flexShrink: 0,
              }}/>
              {isAdmin ? "Admin access" : "Staff access"} · Gemini 1.5 Flash · Live data
            </div>
          </div>
        </div>
      )}
    </>
  );
}
