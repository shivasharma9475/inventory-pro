// components/billing/ReceiptDocument.jsx — Redesigned (real-world e-commerce invoice style)
// No backend changes — all props are identical.
import { forwardRef } from "react";

const PAYMENT_META = {
  upi:           { label: "UPI / Razorpay", icon: "📲", color: "#7c3aed", light: "#f3f0ff", border: "#c4b5fd" },
  card:          { label: "Card (Stripe)",  icon: "💳", color: "#2563eb", light: "#eff6ff", border: "#93c5fd" },
  bank_transfer: { label: "Bank Transfer",  icon: "🏦", color: "#d97706", light: "#fffbeb", border: "#fcd34d" },
  cash:          { label: "Cash",           icon: "💵", color: "#16a34a", light: "#f0fdf4", border: "#86efac" },
};

// ── Small primitives ──────────────────────────────────────────────────────────
const Row = ({ label, value, mono, green, bold }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "5px 0" }}>
    <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
    <span style={{
      fontSize: bold ? 14 : 12,
      fontWeight: bold ? 700 : 500,
      color: green ? "#16a34a" : "#111",
      fontFamily: mono ? "monospace" : "inherit",
      letterSpacing: mono ? "0.04em" : "inherit",
    }}>{value}</span>
  </div>
);

const SectionLabel = ({ children }) => (
  <p style={{
    fontSize: 9, fontWeight: 600, color: "#9ca3af",
    textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8,
  }}>{children}</p>
);

// ─────────────────────────────────────────────────────────────────────────────
export const ReceiptDocument = forwardRef(function ReceiptDocument({ bill, company }, ref) {
  const pm        = PAYMENT_META[bill.payment?.method] || { label: "N/A", icon: "💰", color: "#888", light: "#f9fafb", border: "#e5e7eb" };
  const isPending = bill.payment?.status === "pending";

  const items        = bill.items || [];
  const subtotalRaw  = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountRaw  = items.reduce((s, i) => s + i.price * (i.discount || 0) / 100 * i.quantity, 0);
  const taxAmount    = bill.taxAmount   || 0;
  const totalAmount  = bill.totalAmount || 0;

  const formatDate = (d) => new Date(d || Date.now()).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });

  return (
    <div
      ref={ref}
      style={{
        padding: 28, background: "#fff", color: "#111",
        fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
        fontSize: 13, lineHeight: 1.5,
      }}
    >

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>

        {/* Company info */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            {company?.logoUrl ? (
              <img
                src={company.logoUrl}
                alt="logo"
                style={{
                  width: 40, height: 40, borderRadius: 10,
                  objectFit: "contain", border: "1px solid #e5e7eb",
                }}
                onError={(e) => { e.target.style.display = "none"; }}
              />
            ) : (
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontWeight: 700, fontSize: 16, flexShrink: 0,
              }}>
                {company?.name?.[0] || "A"}
              </div>
            )}
            <div>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 1 }}>
                {company?.name || "Your Company"}
              </p>
              {company?.tagline && (
                <p style={{ fontSize: 10, color: "#9ca3af", letterSpacing: "0.03em" }}>
                  {company.tagline}
                </p>
              )}
            </div>
          </div>
          <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.9 }}>
            {company?.address && <div>{company.address}</div>}
            {(company?.city || company?.state || company?.pincode) && (
              <div>
                {[company.city, company.state].filter(Boolean).join(", ")}
                {company.pincode ? ` — ${company.pincode}` : ""}
              </div>
            )}
            {company?.phone && <div>📞 {company.phone}</div>}
            {company?.email && <div>✉ {company.email}</div>}
          </div>
        </div>

        {/* Invoice meta */}
        <div style={{ textAlign: "right" }}>
          <p style={{
            fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em",
            color: isPending ? "#d97706" : "#111",
          }}>
            {isPending ? "PROFORMA" : "INVOICE"}
          </p>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4, fontFamily: "monospace" }}>
            #{bill.billId || bill._id}
          </p>
          <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 3 }}>
            {formatDate(bill.createdAt)}
          </p>

          <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center" }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "4px 12px", borderRadius: 20, fontSize: 10, fontWeight: 700,
              letterSpacing: "0.07em",
              background: isPending ? "#fef3c7" : "#dcfce7",
              border: `1px solid ${isPending ? "#fcd34d" : "#86efac"}`,
              color: isPending ? "#92400e" : "#15803d",
            }}>
              {isPending ? "⏳ PAYMENT PENDING" : "✓ PAID"}
            </span>
          </div>
        </div>
      </div>

      {/* ── GSTIN ───────────────────────────────────────────────────────── */}
      {company?.gst && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: "#f9fafb", border: "0.5px solid #e5e7eb",
          borderRadius: 8, padding: "7px 14px", marginBottom: 18,
        }}>
          <span style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
            Company GSTIN
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#374151", fontFamily: "monospace", letterSpacing: "0.06em" }}>
            {company.gst}
          </span>
        </div>
      )}

      {/* ── BILL TO + PAYMENT ROW ────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }}>

        {/* Bill to */}
        <div style={{
          background: "#f9fafb", border: "0.5px solid #e5e7eb",
          borderRadius: 10, padding: "13px 14px",
        }}>
          <SectionLabel>Bill to</SectionLabel>
          <p style={{ fontWeight: 700, fontSize: 14, color: "#111", marginBottom: 4 }}>
            {bill.buyer?.name}
          </p>
          {bill.buyer?.phone && (
            <p style={{ color: "#4b5563", fontSize: 11, marginBottom: 2 }}>📞 {bill.buyer.phone}</p>
          )}
          {bill.buyer?.email && (
            <p style={{ color: "#4b5563", fontSize: 11, marginBottom: 2 }}>✉ {bill.buyer.email}</p>
          )}
          {bill.buyer?.gst && (
            <p style={{ color: "#4b5563", fontSize: 11, marginTop: 5 }}>
              GST: <strong style={{ fontFamily: "monospace" }}>{bill.buyer.gst}</strong>
            </p>
          )}
          {bill.buyer?.address && (
            <p style={{ color: "#6b7280", marginTop: 6, fontSize: 11, lineHeight: 1.7 }}>
              {[
                bill.buyer.address,
                bill.buyer.city,
                bill.buyer.state,
                bill.buyer.pincode ? `— ${bill.buyer.pincode}` : "",
              ].filter(Boolean).join(", ")}
            </p>
          )}
        </div>

        {/* Payment details */}
        <div style={{
          background: "#f9fafb", border: "0.5px solid #e5e7eb",
          borderRadius: 10, padding: "13px 14px",
        }}>
          <SectionLabel>Payment</SectionLabel>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8,
            background: pm.light, border: `1px solid ${pm.border}`,
            borderRadius: 8, padding: "5px 12px",
          }}>
            <span style={{ fontSize: 14 }}>{pm.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: pm.color }}>{pm.label}</span>
          </div>

          <p style={{
            fontSize: 12, fontWeight: 600,
            color: isPending ? "#d97706" : "#16a34a",
            marginBottom: 5,
          }}>
            {isPending ? "⏳ Pending confirmation" : "✓ Payment received"}
          </p>

          {/* Method-specific ref */}
          {bill.payment?.razorpayPaymentId && (
            <p style={{ fontSize: 10, color: "#6b7280", fontFamily: "monospace", marginTop: 3 }}>
              ID: {bill.payment.razorpayPaymentId}
            </p>
          )}
          {bill.payment?.stripePaymentIntentId && (
            <>
              {bill.payment.last4 && (
                <p style={{ fontSize: 11, color: "#4b5563", marginTop: 3 }}>
                  Card: ••••{bill.payment.last4}{bill.payment.brand ? ` (${bill.payment.brand})` : ""}
                </p>
              )}
              <p style={{ fontSize: 9, color: "#9ca3af", marginTop: 2, fontFamily: "monospace" }}>
                {bill.payment.stripePaymentIntentId}
              </p>
            </>
          )}
          {bill.payment?.txnRef && (
            <div style={{ marginTop: 6 }}>
              <p style={{ fontSize: 9, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
                Ref
              </p>
              <p style={{
                fontSize: 13, fontWeight: 700, color: "#92400e",
                fontFamily: "monospace", letterSpacing: "0.06em",
              }}>
                {bill.payment.txnRef}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── ITEMS TABLE ──────────────────────────────────────────────────── */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: "#f3f4f6", borderBottom: "1px solid #e5e7eb" }}>
            {["#", "Item", "Qty", "Unit price", "Disc.", "Total"].map((h, i) => (
              <th key={h} style={{
                padding: "8px 10px",
                textAlign: i <= 1 ? "left" : "right",
                fontSize: 9, color: "#6b7280",
                textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => {
            const discounted = item.price * (1 - (item.discount || 0) / 100);
            const lineTotal  = discounted * item.quantity;
            return (
              <tr key={idx} style={{
                background: idx % 2 === 0 ? "#fff" : "#fafafa",
                borderBottom: "0.5px solid #f0f0f0",
              }}>
                <td style={{ padding: "9px 10px", color: "#9ca3af", fontSize: 11 }}>
                  {idx + 1}
                </td>
                <td style={{ padding: "9px 10px" }}>
                  <p style={{ fontWeight: 600, color: "#111", marginBottom: 1 }}>{item.name}</p>
                  {item.category && (
                    <p style={{ fontSize: 10, color: "#9ca3af" }}>{item.category}</p>
                  )}
                </td>
                <td style={{ padding: "9px 10px", textAlign: "right", color: "#4b5563" }}>
                  {item.quantity}
                </td>
                <td style={{ padding: "9px 10px", textAlign: "right", color: "#4b5563" }}>
                  ₹{item.price.toLocaleString("en-IN")}
                </td>
                <td style={{ padding: "9px 10px", textAlign: "right" }}>
                  {item.discount > 0 ? (
                    <span style={{
                      fontSize: 11, color: "#15803d", fontWeight: 600,
                      background: "#dcfce7", padding: "2px 7px", borderRadius: 20,
                    }}>{item.discount}%</span>
                  ) : (
                    <span style={{ color: "#d1d5db" }}>—</span>
                  )}
                </td>
                <td style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700, color: "#111" }}>
                  ₹{lineTotal.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── TOTALS ──────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", justifyContent: "flex-end", marginTop: 4,
      }}>
        <div style={{
          width: 240, borderTop: "1px solid #e5e7eb", paddingTop: 12, marginTop: 4,
        }}>
          {discountRaw > 0 && (
            <>
              <Row label="Subtotal (before discounts)"
                value={`₹${subtotalRaw.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`} />
              <Row label="Item discounts"
                value={`− ₹${discountRaw.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`}
                green />
            </>
          )}
          {taxAmount > 0 && (
            <Row label={`Tax (${bill.taxRate || 0}%)`}
              value={`₹${taxAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`} />
          )}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
            paddingTop: 12, marginTop: 8,
            borderTop: "2px solid #111",
          }}>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Grand total</span>
            <span style={{
              fontSize: 20, fontWeight: 800,
              color: isPending ? "#d97706" : "#15803d",
            }}>
              ₹{totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* ── BANK PENDING NOTICE ──────────────────────────────────────────── */}
      {isPending && bill.payment?.txnRef && (
        <div style={{
          marginTop: 20, padding: "12px 16px", borderRadius: 10,
          background: "#fffbeb", border: "1px dashed #fcd34d",
        }}>
          <p style={{ fontSize: 12, color: "#92400e", fontWeight: 600, marginBottom: 5 }}>
            ⚠ Payment pending — Please transfer to the bank account using the reference below:
          </p>
          <p style={{
            fontSize: 20, fontWeight: 800, color: "#b45309",
            letterSpacing: "0.08em", fontFamily: "monospace",
          }}>
            {bill.payment.txnRef}
          </p>
          <p style={{ fontSize: 11, color: "#92400e", marginTop: 5 }}>
            Your invoice will be activated once the admin confirms receipt.
          </p>
        </div>
      )}

      {/* ── NOTES / TERMS ───────────────────────────────────────────────── */}
      <div style={{
        marginTop: 22, padding: "12px 14px", borderRadius: 8,
        background: "#f9fafb", border: "0.5px solid #e5e7eb",
      }}>
        <p style={{
          fontSize: 9, color: "#9ca3af", textTransform: "uppercase",
          letterSpacing: "0.08em", fontWeight: 600, marginBottom: 5,
        }}>Notes</p>
        <p style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.7 }}>
          Thank you for your purchase! For any queries regarding this invoice,
          please contact us at {company?.email || "support@yourcompany.com"}.
          {isPending
            ? " This is a proforma invoice — final invoice will be issued after payment confirmation."
            : " This is a computer-generated invoice and does not require a signature."}
        </p>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <div style={{
        marginTop: 20, paddingTop: 14, borderTop: "0.5px dashed #e5e7eb",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <p style={{ fontSize: 10, color: "#d1d5db" }}>
          {company?.website || ""}
        </p>
        <p style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic" }}>
          Thank you for your business 🙏
        </p>
        <p style={{ fontSize: 10, color: "#d1d5db" }}>
          Computer generated
        </p>
      </div>
    </div>
  );
});