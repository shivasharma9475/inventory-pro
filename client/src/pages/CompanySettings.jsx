// src/pages/CompanySettingsPage.jsx
import { useState, useEffect } from "react";
import { useNavigate }         from "react-router-dom";
import { useAuth }             from "../components/hooks/useAuth";
import { getCompanySettings, updateCompanySettings } from "../services/companySettingsService";
import { invalidateCompanySettingsCache }             from "../components/hooks/useCompanySettings";
import { getMe }               from "../services/authService";
import { colors, card }        from "../styles/tokens";
import { Alert, SaveBtn }      from "../components/settings/ui";
import {
  CompanyPanel, AddressPanel, TaxPanel,
  BankPanel, GatewaysPanel, MethodsPanel, InvoicePanel,
} from "../components/settings/AdminPanels";
import { StaffProfilePanel }   from "../components/settings/StaffPanel";

// ── Nav configuration ─────────────────────────────────────────────────────────
const ADMIN_TABS = [
  { id: "company",  label: "Company",         icon: "🏢", group: "Settings"  },
  { id: "address",  label: "Address",          icon: "📍", group: "Settings"  },
  { id: "tax",      label: "GST & Tax",        icon: "🧾", group: "Settings"  },
  { id: "bank",     label: "Bank / UPI",       icon: "🏦", group: "Payments"  },
  { id: "gateways", label: "Gateways",         icon: "💳", group: "Payments"  },
  { id: "methods",  label: "Pay Methods",      icon: "💰", group: "Payments"  },
  { id: "invoice",  label: "Invoice",          icon: "📄", group: "Documents" },
];

const PANEL_TITLES = {
  company:  { title: "Company Info",       sub: "Brand identity and contact details"    },
  address:  { title: "Address",            sub: "Registered business address"           },
  tax:      { title: "GST & Tax",          sub: "GSTIN, PAN and default tax rates"      },
  bank:     { title: "Bank / UPI",         sub: "Payout and checkout bank details"      },
  gateways: { title: "Payment Gateways",   sub: "Razorpay & Stripe API credentials"     },
  methods:  { title: "Payment Methods",    sub: "Methods shown at customer checkout"    },
  invoice:  { title: "Invoice Settings",   sub: "Prefix, templates and display options" },
  profile:  { title: "My Profile",         sub: "Personal info and password"            },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function deepMerge(target, source) {
  if (!source || typeof source !== "object") return source ?? target;
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] !== null && source[key] !== undefined) {
      out[key] =
        typeof source[key] === "object" && !Array.isArray(source[key])
          ? deepMerge(target[key] || {}, source[key])
          : source[key];
    }
  }
  return out;
}

const INITIAL_FORM = {
  companyName: "", tagline: "", email: "", phone: "", website: "",
  address: "", city: "", state: "", pincode: "", country: "India",
  gst: "", pan: "", defaultTaxRate: 18,
  companyLogo: { url: "" },
  bank:     { accountName: "", bankName: "", accountNo: "", ifsc: "", branch: "", accountType: "Current" },
  upi:      { id: "", name: "" },
  razorpay: { keyId: "", keySecret: "", enabled: false },
  stripe:   { publishableKey: "", secretKey: "", webhookSecret: "", enabled: false },
  invoice:  { prefix: "BILL", termsNotes: "", footerText: "Thank you for your business 🙏", showLogo: true, showGst: true },
  enabledPaymentMethods: { cash: true, upi: false, card: false, bankTransfer: false },
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CompanySettingsPage() {
  const navigate = useNavigate();
  const { user: authUser, isAdmin, setUser } = useAuth();

  const [activePanel, setActivePanel] = useState(isAdmin ? "company" : "profile");
  useEffect(() => {
  if (isAdmin) {
    setActivePanel("company");
  } else {
    setActivePanel("profile");
  }
}, [isAdmin]);
  
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [error,       setError]       = useState("");

  const [form,      setForm]      = useState(INITIAL_FORM);
  const [staffUser, setStaffUser] = useState(null);

  const set  = (k, v)     => setForm((f) => ({ ...f, [k]: v }));
  const setN = (ns, k, v) => setForm((f) => ({ ...f, [ns]: { ...f[ns], [k]: v } }));

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        if (isAdmin) {
          const res = await getCompanySettings();
          const d   = res.data?.data;
          if (d) {
            if (d.logoUrl) d.companyLogo = { url: d.logoUrl };
            setForm((f) => deepMerge(f, d));
          }
        } else {
          const res = await getMe();
          setStaffUser(res.data?.user || {});
        }
      } catch (err) {
        if (err.response?.status === 401) { localStorage.clear(); navigate("/login"); }
        else setError("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin]);

  // ── Admin save ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError(""); setSaved(false);
    try {
      await updateCompanySettings(form);
      invalidateCompanySettingsCache();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      if (err.response?.status === 401) { localStorage.clear(); navigate("/login"); }
      else setError(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ── Panel renderer ──────────────────────────────────────────────────────────
  const renderPanel = () => {
    if (!isAdmin) return (
      <StaffProfilePanel
        user={staffUser || authUser}
        setUser={(u) => { setStaffUser(u); setUser(u); }}
      />
    );
    switch (activePanel) {
      case "company":  return <CompanyPanel  form={form} set={set} />;
      case "address":  return <AddressPanel  form={form} set={set} />;
      case "tax":      return <TaxPanel      form={form} set={set} />;
      case "bank":     return <BankPanel     form={form} setN={setN} />;
      case "gateways": return <GatewaysPanel form={form} setN={setN} />;
      case "methods":  return <MethodsPanel  form={form} setN={setN} />;
      case "invoice":  return <InvoicePanel  form={form} setN={setN} />;
      default:         return null;
    }
  };

  if (loading) return (
    <div style={{ padding: 40, textAlign: "center", color: colors.text3, fontSize: 13 }}>
      Loading settings…
    </div>
  );

  const { title: panelTitle, sub: panelSub } = PANEL_TITLES[activePanel] || {};
  const tabs = isAdmin ? ADMIN_TABS : [];

  // Group tabs for the tab bar
  const groups = isAdmin
    ? [...new Set(ADMIN_TABS.map((t) => t.group))]
    : [];

  return (
    <div style={{
      height: "100%",
      display: "flex",
      flexDirection: "column",
      background: colors.bg,
      overflow: "hidden",
    }}>

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div style={{
        padding: "20px 28px 0",
        background: colors.surface,
        borderBottom: `0.5px solid ${colors.border}`,
        flexShrink: 0,
      }}>
        {/* Title row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: colors.text1, margin: 0 }}>
              {isAdmin ? "Settings" : "My Profile"}
            </h1>
            <p style={{ fontSize: 11, color: colors.text3, marginTop: 3 }}>
              {isAdmin
                ? "Manage your company configuration, payments and invoicing"
                : "Update your personal information and password"}
            </p>
          </div>

          {/* Role badge */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 500,
            background: isAdmin ? colors.accentDim : colors.greenDim,
            border:     `0.5px solid ${isAdmin ? colors.accentBorder : "rgba(52,211,153,0.3)"}`,
            color:      isAdmin ? colors.accent : colors.green,
          }}>
            <span>{isAdmin ? "🛡" : "👤"}</span>
            <span>{isAdmin ? "Administrator" : "Staff member"}</span>
          </div>
        </div>

        {/* Tab bar (admin only) */}
        {isAdmin && (
          <div style={{ display: "flex", gap: 0, overflowX: "auto" }}>
            {groups.map((group, gi) => (
              <div key={group} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                {/* Group label — subtle, inline */}
                <span style={{
                  fontSize: 9, color: colors.text3, letterSpacing: "0.08em",
                  textTransform: "uppercase", padding: "0 8px 10px",
                  alignSelf: "flex-end",
                  ...(gi === 0 ? {} : { borderLeft: `0.5px solid ${colors.border}`, paddingLeft: 16, marginLeft: 8 }),
                }}>
                  {group}
                </span>
                {ADMIN_TABS.filter((t) => t.group === group).map((tab) => {
                  const isActive = activePanel === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { setActivePanel(tab.id); setError(""); setSaved(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "8px 14px 10px",
                        background: "transparent",
                        border: "none",
                        borderBottom: isActive
                          ? `2px solid ${colors.accent}`
                          : "2px solid transparent",
                        color:       isActive ? colors.accent : colors.text2,
                        fontSize:    13,
                        fontWeight:  isActive ? 500 : 400,
                        cursor:      "pointer",
                        whiteSpace:  "nowrap",
                        transition:  "all 0.15s",
                        marginBottom: -1, // align with border-bottom of container
                      }}
                    >
                      <span style={{ fontSize: 13 }}>{tab.icon}</span>
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Scrollable content ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>

        {/* Active panel subtitle */}
        {isAdmin && (
          <div style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: colors.text1, margin: 0 }}>{panelTitle}</h2>
            <p  style={{ fontSize: 11, color: colors.text3, marginTop: 3 }}>{panelSub}</p>
          </div>
        )}

        {error && <Alert type="danger" icon="⚠️">{error}</Alert>}

        {isAdmin ? (
          <form onSubmit={handleSubmit}>
            {renderPanel()}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "flex-end",
              gap: 10, marginTop: 8, paddingTop: 16,
              borderTop: `0.5px solid ${colors.border}`,
            }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: "9px 18px", borderRadius: 8, fontSize: 13,
                  background: "transparent", border: `0.5px solid ${colors.border2}`,
                  color: colors.text2, cursor: "pointer",
                }}
              >
                Discard
              </button>
              <SaveBtn saving={saving} saved={saved} />
            </div>
          </form>
        ) : (
          renderPanel()
        )}
      </div>
    </div>
  );
}