// components/billing/PaymentPanel.jsx — Redesigned (real-world e-commerce style)
// Only shows payment methods that admin has enabled in Company Settings.
// No backend changes — all props are identical.

const ALL_METHODS = [
  {
    id: "cash", label: "Cash", icon: "💵",
    sub: "Collect in store",
    color: "#16a34a", bg: "rgba(22,163,74,0.08)", border: "rgba(22,163,74,0.3)",
    settingsKey: "cash",
  },
  {
    id: "upi", label: "UPI / Wallets", icon: "📲",
    sub: "GPay · PhonePe · Paytm",
    color: "#7c3aed", bg: "rgba(124,58,237,0.08)", border: "rgba(124,58,237,0.3)",
    settingsKey: "upi",
  },
  {
    id: "card", label: "Card", icon: "💳",
    sub: "Visa · Mastercard · RuPay",
    color: "#2563eb", bg: "rgba(37,99,235,0.08)", border: "rgba(37,99,235,0.3)",
    settingsKey: "card",
  },
  {
    id: "bank_transfer", label: "Bank Transfer", icon: "🏦",
    sub: "IMPS · NEFT · RTGS",
    color: "#d97706", bg: "rgba(217,119,6,0.08)", border: "rgba(217,119,6,0.3)",
    settingsKey: "bankTransfer",
  },
];

// ── Shared inner styles ───────────────────────────────────────────────────────
const infoBox = (bg, border) => ({
  marginTop: 14, padding: "14px 16px", borderRadius: 10,
  background: bg, border: `0.5px solid ${border}`,
});

const monoTag = (color, bg, border) => ({
  display: "inline-block", padding: "4px 12px", borderRadius: 20,
  background: bg, border: `0.5px solid ${border}`,
  fontSize: 12, color, fontFamily: "monospace", letterSpacing: "0.04em",
});

const walletPill = {
  fontSize: 10, padding: "3px 10px", borderRadius: 20,
  background: "rgba(124,58,237,0.1)", border: "0.5px solid rgba(124,58,237,0.2)",
  color: "rgba(167,139,250,0.8)", letterSpacing: "0.05em",
};

// ── Method Selector ───────────────────────────────────────────────────────────
export function PaymentMethodSelector({ selected, onSelect, enabledMethods, settingsLoading }) {
  const visibleMethods = ALL_METHODS.filter((m) => enabledMethods?.[m.settingsKey]);

  if (settingsLoading) return (
    <div style={{ padding: "20px 0", textAlign: "center" }}>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>
        Loading payment methods…
      </span>
    </div>
  );

  if (visibleMethods.length === 0) return (
    <div style={{
      padding: "16px", borderRadius: 10, textAlign: "center",
      background: "rgba(248,113,113,0.06)", border: "0.5px solid rgba(248,113,113,0.2)",
    }}>
      <p style={{ fontSize: 22, marginBottom: 6 }}>⚠️</p>
      <p style={{ color: "#f87171", fontSize: 13, fontWeight: 500 }}>No payment methods enabled</p>
      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 5, lineHeight: 1.6 }}>
        Ask your admin to enable payment methods<br />in Company Settings.
      </p>
    </div>
  );

  const cols = visibleMethods.length === 1 ? "1fr"
             : visibleMethods.length === 2 ? "1fr 1fr"
             : visibleMethods.length === 3 ? "1fr 1fr 1fr"
             : "1fr 1fr";

  return (
    <div style={{ display: "grid", gridTemplateColumns: cols, gap: 8, marginBottom: 4 }}>
      {visibleMethods.map((m) => {
        const active = selected === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            style={{
              padding: "11px 8px", borderRadius: 10, cursor: "pointer",
              textAlign: "center", outline: "none", transition: "all 0.15s",
              background: active ? m.bg : "rgba(255,255,255,0.03)",
              border: `0.5px solid ${active ? m.border : "rgba(255,255,255,0.08)"}`,
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 5 }}>{m.icon}</div>
            <div style={{
              fontSize: 12, fontWeight: active ? 600 : 400,
              color: active ? m.color : "rgba(255,255,255,0.4)",
              marginBottom: 3,
            }}>{m.label}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.03em" }}>
              {m.sub}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── UPI Panel ─────────────────────────────────────────────────────────────────
export function UPIPanel({ amount, companySettings }) {
  return (
    <div style={infoBox("rgba(124,58,237,0.07)", "rgba(124,58,237,0.22)")}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📲</div>
        <p style={{ color: "#a78bfa", fontWeight: 600, fontSize: 15, marginBottom: 6 }}>
          Pay ₹{Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
        </p>

        {companySettings?.upi?.id && (
          <div style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.28)", letterSpacing: "0.07em",
              textTransform: "uppercase", marginBottom: 5 }}>UPI ID</p>
            <span style={monoTag("#a78bfa", "rgba(167,139,250,0.1)", "rgba(167,139,250,0.25)")}>
              {companySettings.upi.id}
            </span>
          </div>
        )}

        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, lineHeight: 1.7, marginBottom: 10 }}>
          Clicking <strong style={{ color: "rgba(255,255,255,0.55)" }}>"Pay Now"</strong> opens the
          Razorpay checkout —<br />GPay, PhonePe, Paytm &amp; UPI supported.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
          {["Google Pay", "PhonePe", "Paytm", "UPI"].map((w) => (
            <span key={w} style={walletPill}>{w}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Card Panel ────────────────────────────────────────────────────────────────
export function CardPanel({ cardDomRef, cardReady }) {
  return (
    <div style={infoBox("rgba(37,99,235,0.07)", "rgba(37,99,235,0.22)")}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.5)" }}>
          Card details
        </span>
        <span style={{
          fontSize: 10, color: "rgba(255,255,255,0.25)",
          display: "flex", alignItems: "center", gap: 4,
        }}>🔒 Secured by Stripe</span>
      </div>

      {!cardReady && (
        <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="loader" style={{ width: 13, height: 13 }} />
        </div>
      )}

      <div
        ref={cardDomRef}
        style={{
          background: "rgba(255,255,255,0.05)",
          border: "0.5px solid rgba(255,255,255,0.12)",
          borderRadius: 8, padding: "12px 14px", minHeight: 44,
          display: cardReady ? "block" : "none",
          transition: "border-color 0.2s",
        }}
      />

      <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "center" }}>
        {["Visa", "Mastercard", "RuPay", "Amex"].map((b) => (
          <span key={b} style={{
            fontSize: 9, padding: "3px 9px", borderRadius: 20,
            background: "rgba(37,99,235,0.1)", border: "0.5px solid rgba(37,99,235,0.2)",
            color: "rgba(96,165,250,0.8)",
          }}>{b}</span>
        ))}
      </div>

      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.18)", marginTop: 10, textAlign: "center" }}>
        Raw card data never reaches your server — tokenized by Stripe
      </p>
    </div>
  );
}

// ── Cash Panel ────────────────────────────────────────────────────────────────
export function CashPanel({ amount }) {
  return (
    <div style={infoBox("rgba(22,163,74,0.07)", "rgba(22,163,74,0.22)")}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>💵</div>
        <p style={{ color: "#4ade80", fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
          Collect ₹{Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
        </p>
        <p style={{ color: "rgba(255,255,255,0.28)", fontSize: 11, lineHeight: 1.6 }}>
          Confirm you've received the cash.<br />
          The invoice will be generated instantly.
        </p>
      </div>
    </div>
  );
}

// ── Bank Transfer hint (before initiation) ────────────────────────────────────
export function BankHintPanel({ companySettings }) {
  const bank = companySettings?.bank;
  return (
    <div style={infoBox("rgba(217,119,6,0.07)", "rgba(217,119,6,0.22)")}>
      <p style={{ color: "#fbbf24", fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
        🏦 Bank Transfer
      </p>

      {bank?.accountNo ? (
        <>
          <p style={{ color: "rgba(255,255,255,0.32)", fontSize: 11, marginBottom: 12, lineHeight: 1.7 }}>
            Click <strong style={{ color: "rgba(255,255,255,0.5)" }}>"Record Transfer"</strong> to generate
            a unique reference ID. Share the bank details with the buyer — the bill activates once admin
            confirms payment.
          </p>
          <div style={{
            background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 12px",
            border: "0.5px solid rgba(255,255,255,0.06)",
          }}>
            {[
              ["Bank",    bank.bankName],
              ["Account", bank.accountNo ? `••••${bank.accountNo.slice(-4)}` : null],
              ["IFSC",    bank.ifsc],
            ].map(([k, v]) => v ? (
              <div key={k} style={{
                display: "flex", justifyContent: "space-between",
                fontSize: 12, padding: "4px 0",
                borderBottom: "0.5px solid rgba(255,255,255,0.04)",
              }}>
                <span style={{ color: "rgba(255,255,255,0.3)" }}>{k}</span>
                <span style={{ color: "#fbbf24", fontFamily: "monospace" }}>{v}</span>
              </div>
            ) : null)}
          </div>
        </>
      ) : (
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, lineHeight: 1.6 }}>
          ⚠ Bank details not configured.<br />
          Ask admin to fill bank details in Company Settings.
        </p>
      )}
    </div>
  );
}

// ── Bank Transfer info (after initiation) ─────────────────────────────────────
export function BankPanel({ bankInfo }) {
  const details = bankInfo?.bankDetails;
  if (!details) return null;

  return (
    <div style={infoBox("rgba(217,119,6,0.07)", "rgba(217,119,6,0.22)")}>
      {/* Status header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#fbbf24" }}>✓ Transfer Recorded</span>
        <span style={{
          fontSize: 10, padding: "3px 9px", borderRadius: 20,
          background: "rgba(251,191,36,0.1)", border: "0.5px solid rgba(251,191,36,0.25)",
          color: "#fbbf24",
        }}>Pending admin confirmation</span>
      </div>

      {/* Reference ID */}
      <div style={{
        background: "rgba(251,191,36,0.08)", border: "1px dashed rgba(251,191,36,0.3)",
        borderRadius: 10, padding: "12px 14px", marginBottom: 14, textAlign: "center",
      }}>
        <p style={{
          fontSize: 10, color: "rgba(255,255,255,0.3)",
          textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6,
        }}>Payment reference</p>
        <p style={{ fontSize: 22, fontWeight: 700, color: "#fcd34d", letterSpacing: "0.1em" }}>
          {details.reference}
        </p>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 5 }}>
          Use this as the narration / remarks while transferring
        </p>
      </div>

      {/* Bank details */}
      <div style={{
        background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "10px 12px",
        border: "0.5px solid rgba(255,255,255,0.05)",
      }}>
        {[
          ["Account name", details.accountName],
          ["Bank",         details.bank],
          ["Account no.",  details.accountNo],
          ["IFSC",         details.ifsc],
          ["Amount",       `₹${Number(details.amount).toFixed(2)}`],
        ].map(([k, v]) => v ? (
          <div key={k} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "6px 0", borderBottom: "0.5px solid rgba(255,255,255,0.04)", fontSize: 12,
          }}>
            <span style={{ color: "rgba(255,255,255,0.3)" }}>{k}</span>
            <span style={{
              color: "#fcd34d", fontWeight: 500,
              fontFamily: (k === "IFSC" || k === "Account no.") ? "monospace" : "inherit",
            }}>{v}</span>
          </div>
        ) : null)}
      </div>

      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", marginTop: 12, lineHeight: 1.8 }}>
        ⏳ Bill activates after admin confirms payment.<br />
        Ref: <strong style={{ color: "rgba(255,255,255,0.45)", fontFamily: "monospace" }}>
          {details.reference}
        </strong>
      </p>
    </div>
  );
}

// ── Status Bar ────────────────────────────────────────────────────────────────
export function PaymentStatusBar({ status, errorMsg }) {
  if (status === "loading") return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "11px 14px", borderRadius: 8, marginTop: 12,
      background: "rgba(255,255,255,0.04)", border: "0.5px solid rgba(255,255,255,0.08)",
    }}>
      <span className="loader" style={{ width: 14, height: 14, flexShrink: 0 }} />
      <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>
        Processing payment…
      </span>
    </div>
  );

  if (status === "error") return (
    <div style={{
      padding: "11px 14px", borderRadius: 8, marginTop: 12,
      background: "rgba(248,113,113,0.07)", border: "0.5px solid rgba(248,113,113,0.22)",
    }}>
      <p style={{ color: "#f87171", fontSize: 13, fontWeight: 500 }}>⚠ {errorMsg}</p>
      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11, marginTop: 4 }}>
        Please try again or choose a different payment method.
      </p>
    </div>
  );

  if (status === "bank_pending") return (
    <div style={{
      padding: "11px 14px", borderRadius: 8, marginTop: 12,
      background: "rgba(251,191,36,0.06)", border: "0.5px solid rgba(251,191,36,0.22)",
    }}>
      <p style={{ color: "#fbbf24", fontSize: 12 }}>
        ⏳ Bank transfer recorded — awaiting admin confirmation
      </p>
    </div>
  );

  return null;
}