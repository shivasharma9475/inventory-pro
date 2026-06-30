// src/components/settings/AdminPanels.jsx
import { useRef, useState } from "react";
import { Field, Select, Toggle, SectionCard, Grid2, Grid3, Alert, Divider } from "./ui";
import { colors } from "../../styles/tokens";
import {
  uploadCompanyLogo,
  deleteCompanyLogo,
} from "../../services/companySettingsService";
import { invalidateCompanySettingsCache } from "../hooks/useCompanySettings";

// ── Company info panel ────────────────────────────────────────────────────────
export function CompanyPanel({ form, set }) {
  const logoInputRef    = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const logoUrl = form.companyLogo?.url || "";

  const handleLogoFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return setLogoError("Only image files allowed");
    if (file.size > 500 * 1024)           return setLogoError("Logo must be under 500 KB");
    setLogoError("");

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const preview = ev.target.result;
      set("companyLogo", { url: preview });        // optimistic preview
      setUploading(true);
      try {
        const res = await uploadCompanyLogo(preview);
        set("companyLogo", { url: res.data.logoUrl });
        invalidateCompanySettingsCache();
      } catch (err) {
        setLogoError(err.response?.data?.message || "Upload failed");
        set("companyLogo", { url: "" });
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoDelete = async () => {
    try {
      await deleteCompanyLogo();
      set("companyLogo", { url: "" });
      invalidateCompanySettingsCache();
    } catch (err) {
      setLogoError(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <SectionCard title="Company identity" icon="🏢">
      {/* Logo uploader */}
      <div style={{
        display: "flex", alignItems: "center", gap: 16, marginBottom: 20,
        padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.02)",
        border: `0.5px dashed ${colors.border2}`,
      }}>
        <div style={{
          width: 62, height: 62, borderRadius: 12, flexShrink: 0, overflow: "hidden",
          background: logoUrl ? "transparent" : colors.accentDim,
          border: `0.5px solid ${logoUrl ? "rgba(52,211,153,0.3)" : colors.accentBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {logoUrl
            ? <img src={logoUrl} alt="company logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            : <span style={{ fontSize: 24, opacity: 0.4 }}>🏢</span>}
        </div>
        <div>
          <p style={{ fontSize: 12, color: colors.text2, marginBottom: 8 }}>Company Logo</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploading}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 11, border: "none",
                background: uploading ? "rgba(255,255,255,0.05)" : `linear-gradient(135deg, ${colors.accent}, #60a5fa)`,
                color: "#fff", cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.6 : 1,
              }}
            >
              {uploading ? "Uploading…" : logoUrl ? "Change logo" : "Upload logo"}
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={handleLogoDelete}
                style={{
                  padding: "6px 12px", borderRadius: 8, fontSize: 11,
                  background: colors.redDim, border: `0.5px solid rgba(248,113,113,0.25)`,
                  color: colors.red, cursor: "pointer",
                }}
              >
                Remove
              </button>
            )}
          </div>
          <p style={{ fontSize: 10, color: colors.text3, marginTop: 6 }}>PNG / JPG / SVG — max 500 KB</p>
          {logoError && <p style={{ fontSize: 11, color: colors.red, marginTop: 4 }}>⚠ {logoError}</p>}
          <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoFile} style={{ display: "none" }} />
        </div>
      </div>

      <Grid2>
        <Field label="Company name *" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Acme Pvt. Ltd." />
        <Field label="Tagline"        value={form.tagline}     onChange={(e) => set("tagline",     e.target.value)} placeholder="Your one-stop shop" />
      </Grid2>
      <Grid2>
        <Field label="Phone"   value={form.phone}   onChange={(e) => set("phone",   e.target.value)} placeholder="+91 XXXXX XXXXX" />
        <Field label="Website" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://acme.com" />
      </Grid2>
    </SectionCard>
  );
}

// ── Address panel ─────────────────────────────────────────────────────────────
export function AddressPanel({ form, set }) {
  return (
    <SectionCard title="Registered address" icon="📍">
      <Field label="Street address" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Plot 12, MG Road" />
      <Grid3>
        <Field label="City"    value={form.city}    onChange={(e) => set("city",    e.target.value)} placeholder="Mumbai" />
        <Field label="State"   value={form.state}   onChange={(e) => set("state",   e.target.value)} placeholder="Maharashtra" />
        <Field label="Pincode" value={form.pincode} onChange={(e) => set("pincode", e.target.value)} placeholder="400001" />
      </Grid3>
      <Field label="Country" value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="India" />
    </SectionCard>
  );
}

// ── GST & Tax panel ───────────────────────────────────────────────────────────
export function TaxPanel({ form, set }) {
  return (
    <SectionCard title="GST & taxation" icon="🧾">
      <Grid3>
        <Field label="GSTIN" value={form.gst} onChange={(e) => set("gst", e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" />
        <Field label="PAN"   value={form.pan} onChange={(e) => set("pan", e.target.value.toUpperCase())} placeholder="AAAAA1234A" />
        <Field label="Default tax rate (%)" type="number" min="0" max="100"
          value={form.defaultTaxRate} onChange={(e) => set("defaultTaxRate", Number(e.target.value))} placeholder="18" />
      </Grid3>
    </SectionCard>
  );
}

// ── Bank & UPI panel ──────────────────────────────────────────────────────────
export function BankPanel({ form, setN }) {
  return (
    <>
      <Alert type="info" icon="ℹ️">
        These details appear to customers at checkout when Bank Transfer is selected.
      </Alert>
      <SectionCard title="Bank account" icon="🏦">
        <Grid2>
          <Field label="Account holder name" value={form.bank.accountName} onChange={(e) => setN("bank", "accountName", e.target.value)} placeholder="Acme Pvt. Ltd." />
          <Field label="Bank name"           value={form.bank.bankName}    onChange={(e) => setN("bank", "bankName",    e.target.value)} placeholder="HDFC Bank" />
        </Grid2>
        <Grid2>
          <Field label="Account number" value={form.bank.accountNo} onChange={(e) => setN("bank", "accountNo", e.target.value)} placeholder="XXXXXXXXXXXX" />
          <Field label="IFSC code"      value={form.bank.ifsc}      onChange={(e) => setN("bank", "ifsc", e.target.value.toUpperCase())} placeholder="HDFC0000001" />
        </Grid2>
        <Grid2>
          <Field label="Branch" value={form.bank.branch} onChange={(e) => setN("bank", "branch", e.target.value)} placeholder="Fort Branch, Mumbai" />
          <Select
            label="Account type"
            value={form.bank.accountType}
            onChange={(e) => setN("bank", "accountType", e.target.value)}
            options={["Current", "Savings"]}
          />
        </Grid2>
      </SectionCard>

      <SectionCard title="UPI details" icon="📲">
        <Grid2>
          <Field label="UPI ID (VPA)"    value={form.upi.id}   onChange={(e) => setN("upi", "id",   e.target.value)} placeholder="yourshop@upi" />
          <Field label="UPI display name" value={form.upi.name} onChange={(e) => setN("upi", "name", e.target.value)} placeholder="Acme Shop" />
        </Grid2>
      </SectionCard>
    </>
  );
}

// ── Payment gateways panel ────────────────────────────────────────────────────
export function GatewaysPanel({ form, setN }) {
  return (
    <>
      <Alert type="warn" icon="🔒">
        Secret keys are AES-256 encrypted in the database. Paste a new value to update — masked dots won't overwrite.
      </Alert>

      {/* Razorpay */}
      <SectionCard>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: colors.text1 }}>🔶 Razorpay</p>
          <Toggle
            label={form.razorpay.enabled ? "Enabled" : "Disabled"}
            value={form.razorpay.enabled}
            onChange={(v) => setN("razorpay", "enabled", v)}
          />
        </div>
        {form.razorpay.enabled && (
          <Grid2>
            <Field label="Key ID (rzp_live_…)"  value={form.razorpay.keyId}     onChange={(e) => setN("razorpay", "keyId",     e.target.value)} placeholder="rzp_live_xxxxx" />
            <Field label="Key secret" secret     value={form.razorpay.keySecret} onChange={(e) => setN("razorpay", "keySecret", e.target.value)} placeholder="Paste to update" />
          </Grid2>
        )}
      </SectionCard>

      {/* Stripe */}
      <SectionCard>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: colors.text1 }}>💳 Stripe</p>
          <Toggle
            label={form.stripe.enabled ? "Enabled" : "Disabled"}
            value={form.stripe.enabled}
            onChange={(v) => setN("stripe", "enabled", v)}
          />
        </div>
        {form.stripe.enabled && (
          <>
            <Field label="Publishable key (pk_live_…)" value={form.stripe.publishableKey} onChange={(e) => setN("stripe", "publishableKey", e.target.value)} placeholder="pk_live_xxxxx" />
            <Grid2>
              <Field label="Secret key (sk_live_…)" secret value={form.stripe.secretKey}     onChange={(e) => setN("stripe", "secretKey",     e.target.value)} placeholder="Paste to update" />
              <Field label="Webhook secret"          secret value={form.stripe.webhookSecret} onChange={(e) => setN("stripe", "webhookSecret", e.target.value)} placeholder="Paste to update" />
            </Grid2>
          </>
        )}
      </SectionCard>
    </>
  );
}

// ── Payment methods panel ─────────────────────────────────────────────────────
export function MethodsPanel({ form, setN }) {
  const pm = form.enabledPaymentMethods;
  return (
    <SectionCard title="Checkout payment methods" icon="💰">
      <p style={{ fontSize: 12, color: colors.text3, marginBottom: 14 }}>
        Toggle which methods appear to buyers at checkout.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Toggle label="Cash on delivery" icon="💵" value={pm.cash}
          onChange={(v) => setN("enabledPaymentMethods", "cash", v)} />
        <Toggle label="UPI / Wallets" sub="Requires Razorpay enabled" icon="📲" value={pm.upi}
          onChange={(v) => setN("enabledPaymentMethods", "upi", v)} />
        <Toggle label="Card (Stripe)" sub="Requires Stripe enabled" icon="💳" value={pm.card}
          onChange={(v) => setN("enabledPaymentMethods", "card", v)} />
        <Toggle label="Bank transfer" sub="Requires bank details filled" icon="🏦" value={pm.bankTransfer}
          onChange={(v) => setN("enabledPaymentMethods", "bankTransfer", v)} />
      </div>

      {pm.upi && !form.razorpay.enabled && (
        <Alert type="danger" icon="⚠️" style={{ marginTop: 12 }}>UPI enabled but Razorpay is OFF — payments will fail.</Alert>
      )}
      {pm.card && !form.stripe.enabled && (
        <Alert type="danger" icon="⚠️" style={{ marginTop: 8 }}>Card enabled but Stripe is OFF — payments will fail.</Alert>
      )}
      {pm.bankTransfer && !form.bank?.accountNo && (
        <Alert type="warn" icon="⚠️" style={{ marginTop: 8 }}>Bank transfer enabled but bank account details are missing.</Alert>
      )}
    </SectionCard>
  );
}

// ── Invoice settings panel ────────────────────────────────────────────────────
export function InvoicePanel({ form, setN }) {
  return (
    <>
      <SectionCard title="Invoice configuration" icon="🧾">
        <Grid2>
          <Field
            label="Invoice prefix"
            value={form.invoice.prefix}
            onChange={(e) => setN("invoice", "prefix", e.target.value)}
            placeholder="BILL"
            hint={`e.g. ${form.invoice.prefix || "BILL"}-20250115-0001`}
          />
          <div /> {/* spacer */}
        </Grid2>
        <Field
          label="Footer text"
          textarea rows={2}
          value={form.invoice.footerText}
          onChange={(e) => setN("invoice", "footerText", e.target.value)}
          placeholder="Thank you for your business!"
        />
        <Field
          label="Terms & notes"
          textarea rows={3}
          value={form.invoice.termsNotes}
          onChange={(e) => setN("invoice", "termsNotes", e.target.value)}
          placeholder="Payment due within 30 days…"
        />
      </SectionCard>

      <SectionCard title="Display options" icon="👁">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Toggle label="Show logo on invoice" icon="🏷" value={form.invoice.showLogo} onChange={(v) => setN("invoice", "showLogo", v)} />
          <Toggle label="Show GST on invoice"  icon="🧾" value={form.invoice.showGst}  onChange={(v) => setN("invoice", "showGst",  v)} />
        </div>
      </SectionCard>

      {/* Live mini-preview */}
      {/* Live Preview */}
<SectionCard title="Live Preview" icon="👁">
  <div
    style={{
      background: "#ffffff",
      borderRadius: 12,
      padding: 18,
      color: "#111827",
      border: "1px solid #e5e7eb",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    }}
  >
    {/* Header */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 12,
      }}
    >
      {form.companyLogo?.url ? (
        <img
          src={form.companyLogo.url}
          alt="logo"
          style={{
            width: 42,
            height: 42,
            objectFit: "contain",
            borderRadius: 8,
          }}
        />
      ) : (
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 10,
            background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: "bold",
            fontSize: 18,
          }}
        >
          {form.companyName?.charAt(0)?.toUpperCase() || "A"}
        </div>
      )}

      <div>
        <h3
          style={{
            margin: 0,
            fontSize: 18,
            fontWeight: 700,
            color: "#111827",
          }}
        >
          {form.companyName || "Your Company"}
        </h3>

        {form.tagline && (
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              color: "#6b7280",
            }}
          >
            {form.tagline}
          </p>
        )}
      </div>
    </div>

    {/* Company Details */}
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        fontSize: 14,
        color: "#374151",
      }}
    >
      {form.gst && form.invoice?.showGst && (
        <p style={{ margin: 0 }}>
          <strong>GSTIN:</strong> {form.gst}
        </p>
      )}

      <p style={{ margin: 0 }}>
        📍 {form.address || "Company Address"}
        {form.city ? `, ${form.city}` : ""}
      </p>

      <p style={{ margin: 0 }}>
        📞 {form.phone || "Not provided"}
      </p>

      <p style={{ margin: 0 }}>
        ✉️ {form.email || "Not provided"}
      </p>

      {form.website && (
        <p style={{ margin: 0 }}>
          🌐 {form.website}
        </p>
      )}
    </div>

    <hr
      style={{
        margin: "14px 0",
        border: "none",
        borderTop: "1px solid #e5e7eb",
      }}
    />

    <p
      style={{
        margin: 0,
        fontSize: 13,
        color: "#6b7280",
        fontStyle: "italic",
      }}
    >
      {form.invoice?.footerText ||
        "Thank you for your business 🙏"}
    </p>
  </div>
</SectionCard>
    </>
  );
}
