/**
 * gemini.service.js  (v2 — role-aware)
 * ─────────────────────────────────────────────────────────────────────────────
 * Responsibilities:
 *   1. Sanitize + validate user input (prompt injection, length, encoding)
 *   2. Build role-scoped system prompt (admin vs staff)
 *   3. Call Gemini 1.5 Flash REST API
 *   4. Return structured result with token usage
 * ─────────────────────────────────────────────────────────────────────────────
 */

"use strict";

const { buildContext }              = require("./contextBuilder");
const { isRestrictedRequest,
        PERMISSION_DENIED_MSG }     = require("../middleware/chatPermissions");

// ── Constants ─────────────────────────────────────────────────────────────────
const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const MAX_HISTORY  = 12;   // last N turns fed to Gemini (saves tokens)
const TIMEOUT_MS   = 25_000;

// ── Prompt injection patterns ─────────────────────────────────────────────────
const INJECTION_PATTERNS = [
  /ignore\s+(previous|prior|all|your)\s+instructions/i,
  /disregard\s+(your\s+)?(system|prior|previous)/i,
  /you\s+are\s+now\s+a?/i,
  /forget\s+(everything|all|your)/i,
  /new\s+(persona|identity|role|instructions)/i,
  /act\s+as\s+(an?\s+)?(unrestricted|DAN|jailbreak|evil|unfiltered)/i,
  /pretend\s+(you\s+are|to\s+be)/i,
  /override\s+(safety|filter|restriction|rule)/i,
  /\bsystem\s*prompt\b/i,
  /<\s*script/i,
  /\$\{.*?\}/,        // template injection
  /`{3}/,             // triple backtick injection
  /\beval\s*\(/i,
];

// ── Input sanitizer ───────────────────────────────────────────────────────────

function sanitizeInput(raw) {
  if (!raw || typeof raw !== "string") {
    throw Object.assign(new Error("Message must be a non-empty string."), { code: "INVALID_INPUT" });
  }

  // Normalize unicode & strip non-printable control chars (except newline/tab)
  let text = raw
    .normalize("NFC")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
    .slice(0, 2000); // hard cap

  if (text.length === 0) {
    throw Object.assign(new Error("Message cannot be empty after sanitization."), { code: "INVALID_INPUT" });
  }

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      throw Object.assign(new Error("PROMPT_INJECTION"), { code: "PROMPT_INJECTION" });
    }
  }

  return text;
}

// ── System prompt builder (role-aware) ───────────────────────────────────────

function buildSystemPrompt(role, userName, contextText) {
  const isAdmin = role === "admin";
  const roleLabel = isAdmin ? "Administrator" : "Staff Member";

  const accessNote = isAdmin
    ? `You have FULL ACCESS to all business data including staff details, revenue analytics, audit logs, and company statistics.`
    : `You have LIMITED ACCESS. You can see products, stock, categories, low-stock alerts, today's sales summary, and your own activity. You CANNOT see staff lists, staff contact details, detailed revenue analytics, audit logs, or company settings. If asked for restricted data, always refuse politely.`;

  return `
You are InventoryBot, an intelligent AI assistant embedded in InventoryPro — a professional inventory and billing management system.

## SESSION IDENTITY
- User: ${userName}
- Role: ${roleLabel}
- Access Level: ${isAdmin ? "ADMIN (Full Access)" : "STAFF (Restricted Access)"}

## YOUR PURPOSE
Answer questions about inventory, products, stock levels, sales, and business operations based ONLY on the real-time data provided below. Do NOT hallucinate numbers, products, or facts not present in the data.

## ACCESS RULES
${accessNote}

${!isAdmin ? `
## STRICT STAFF RESTRICTIONS
When a staff user asks for ANY of the following, respond ONLY with:
"Sorry, you don't have permission to access that information. Please contact your administrator if you need help."
- Staff names, emails, phone numbers, designations, salaries
- Other users' information
- Admin accounts
- Audit logs or system logs
- Company financial settings
- Detailed revenue reports
- Internal analytics dashboards
` : ""}

## RESPONSE GUIDELINES
1. Answer ONLY from the data context below — never invent facts.
2. Use bullet points and clear formatting for lists.
3. For currency, always use ₹ symbol.
4. When asked about specific products, be precise with stock numbers.
5. Be concise but complete — avoid unnecessary filler text.
6. If data shows zero results (e.g., no low-stock items), say so clearly.
7. Keep a professional, helpful tone.
8. If a question is unrelated to inventory/business, politely say so.

## REAL-TIME BUSINESS DATA
Generated at: ${new Date().toISOString()}

${contextText}

## END OF DATA CONTEXT
Answer based strictly on the data above.
`.trim();
}

// ── Gemini REST call ──────────────────────────────────────────────────────────

async function callGemini({ systemPrompt, history, userMessage }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set in environment.");

  // Build contents array from prior turns
  const contents = [];

  history.slice(-MAX_HISTORY).forEach(msg => {
    contents.push({
      role:  msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    });
  });

  contents.push({ role: "user", parts: [{ text: userMessage }] });

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature:      0.25,   // low = factual and grounded
      topP:             0.85,
      maxOutputTokens:  1200,
      candidateCount:   1,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT",       threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  };

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "unknown");
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data      = await res.json();
  const candidate = data.candidates?.[0];

  if (!candidate) throw new Error("Gemini returned no candidates.");
  if (candidate.finishReason === "SAFETY") throw new Error("Gemini safety filter triggered.");

  const text       = candidate.content?.parts?.map(p => p.text).join("") ?? "";
  const tokensUsed = (data.usageMetadata?.promptTokenCount ?? 0) +
                     (data.usageMetadata?.candidatesTokenCount ?? 0);

  return { text: text.trim(), tokensUsed };
}

// ── Public chat function ──────────────────────────────────────────────────────

/**
 * @param {object}  opts
 * @param {string}  opts.companyCode
 * @param {string}  opts.role           - "admin" | "staff"
 * @param {string}  opts.userId         - MongoDB ObjectId string
 * @param {string}  opts.userName
 * @param {Array}   opts.history        - [{role, content}] prior turns
 * @param {string}  opts.userMessage    - raw user input
 * @returns {Promise<{text, tokensUsed, contextSnapshot, latencyMs, wasBlocked}>}
 */
async function chat({ companyCode, role, userId, userName, history = [], userMessage }) {
  const t0 = Date.now();

  // ── Step 1: Sanitize ───────────────────────────────────────────────────────
  const safeMessage = sanitizeInput(userMessage);

  // ── Step 2: Role-based topic block (defence-in-depth) ─────────────────────
  if (isRestrictedRequest(safeMessage, role)) {
    return {
      text:            PERMISSION_DENIED_MSG,
      tokensUsed:      0,
      contextSnapshot: {},
      latencyMs:       Date.now() - t0,
      wasBlocked:      true,
    };
  }

  // ── Step 3: Build role-scoped context (DB queries) ─────────────────────────
  const { contextText, contextSnapshot } = await buildContext({ companyCode, role, userId });

  // ── Step 4: Build system prompt ────────────────────────────────────────────
  const systemPrompt = buildSystemPrompt(role, userName, contextText);

  // ── Step 5: Call Gemini ────────────────────────────────────────────────────
  const { text, tokensUsed } = await callGemini({
    systemPrompt,
    history,
    userMessage: safeMessage,
  });

  return {
    text,
    tokensUsed,
    contextSnapshot,
    latencyMs:  Date.now() - t0,
    wasBlocked: false,
  };
}

module.exports = { chat, sanitizeInput };
