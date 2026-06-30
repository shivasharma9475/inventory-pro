// src/components/settings/ui.jsx
import { colors, inputBase, btnPrimary, card, sectionTitle } from "../../styles/tokens";

// ── Field ─────────────────────────────────────────────────────────────────────
export function Field({ label, hint, secret, readonly, textarea, rows = 3, style = {}, ...props }) {
  const base = {
    ...inputBase,
    width: "100%",
    ...(readonly ? { opacity: 0.4, cursor: "not-allowed" } : {}),
    ...(secret   ? { fontFamily: "monospace", letterSpacing: "0.04em", fontSize: 12 } : {}),
    ...style,
  };

  return (
    <div style={{ marginBottom: 13 }}>
      {label && (
        <label style={{
          display: "block", fontSize: 10, color: colors.text3,
          letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 5,
        }}>
          {label}
        </label>
      )}

      {textarea ? (
        <textarea
          {...props}
          rows={rows}
          readOnly={readonly}
          disabled={readonly}
          style={{ ...base, resize: "vertical", lineHeight: 1.6 }}
        />
      ) : (
        <input
          {...props}
          type={secret ? "password" : props.type || "text"}
          readOnly={readonly}
          disabled={readonly}
          style={base}
        />
      )}

      {hint && (
        <p style={{ fontSize: 10, color: colors.text3, marginTop: 4 }}>{hint}</p>
      )}
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────
export function Select({ label, options = [], readonly, style = {}, ...props }) {
  return (
    <div style={{ marginBottom: 13 }}>
      {label && (
        <label style={{
          display: "block", fontSize: 10, color: colors.text3,
          letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 5,
        }}>
          {label}
        </label>
      )}
      <select
        {...props}
        disabled={readonly}
        style={{
          ...inputBase, width: "100%", appearance: "none", cursor: readonly ? "not-allowed" : "pointer",
          opacity: readonly ? 0.4 : 1, ...style,
        }}
      >
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>
            {o.label ?? o}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Toggle row ────────────────────────────────────────────────────────────────
export function Toggle({ label, sub, icon, value, onChange, disabled }) {
  const on = !!value;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!on)}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        padding: "9px 13px", borderRadius: 9,
        background:  on ? colors.accentDim : "rgba(255,255,255,0.02)",
        border:      `0.5px solid ${on ? colors.accentBorder : colors.border}`,
        cursor:      disabled ? "not-allowed" : "pointer",
        opacity:     disabled ? 0.45 : 1,
        transition:  "all 0.15s", textAlign: "left",
      }}
    >
      {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontSize: 13, color: colors.text1 }}>{label}</span>
        {sub && <span style={{ display: "block", fontSize: 11, color: colors.text3, marginTop: 1 }}>{sub}</span>}
      </span>
      {/* pill switch */}
      <span style={{
        width: 32, height: 18, borderRadius: 9, position: "relative", display: "inline-block",
        background: on ? colors.accent : colors.border2, transition: "background 0.2s", flexShrink: 0,
      }}>
        <span style={{
          position: "absolute", top: 3, left: on ? 17 : 3,
          width: 12, height: 12, borderRadius: "50%", background: "#fff",
          transition: "left 0.18s",
        }} />
      </span>
    </button>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
export function SectionCard({ title, icon, children, style = {} }) {
  return (
    <div style={{ ...card, padding: "20px 22px", marginBottom: 14, ...style }}>
      {title && (
        <p style={sectionTitle}>
          {icon && <span>{icon}</span>}
          {title}
        </p>
      )}
      {children}
    </div>
  );
}

// ── 2- and 3-column grids ─────────────────────────────────────────────────────
export const Grid2 = ({ children, style = {} }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, ...style }}>
    {children}
  </div>
);

export const Grid3 = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
    {children}
  </div>
);

// ── Alert banner ──────────────────────────────────────────────────────────────
const alertStyles = {
  info:    { bg: colors.accentDim,   border: colors.accentBorder,           color: colors.accent },
  warn:    { bg: colors.amberDim,    border: "rgba(251,191,36,0.25)",        color: colors.amber  },
  danger:  { bg: colors.redDim,      border: "rgba(248,113,113,0.25)",       color: colors.red    },
  success: { bg: colors.greenDim,    border: "rgba(52,211,153,0.25)",        color: colors.green  },
};

export function Alert({ type = "info", icon, children }) {
  const s = alertStyles[type];
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 9,
      padding: "10px 13px", borderRadius: 9, marginBottom: 13,
      background: s.bg, border: `0.5px solid ${s.border}`, color: s.color,
      fontSize: 12, lineHeight: 1.5,
    }}>
      {icon && <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{icon}</span>}
      <span>{children}</span>
    </div>
  );
}

// ── Save button ───────────────────────────────────────────────────────────────
export function SaveBtn({ saving, saved, label = "Save changes", disabled }) {
  const savedStyle = saved
    ? { background: colors.greenDim, border: `1px solid rgba(52,211,153,0.4)`, color: colors.green }
    : {};

  return (
    <button
      type="submit"
      disabled={saving || disabled}
      style={{ ...btnPrimary, padding: "10px 26px", letterSpacing: "0.05em", opacity: (saving || disabled) ? 0.6 : 1, ...savedStyle }}
    >
      {saving ? "Saving…" : saved ? "✓ Saved!" : label}
    </button>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
export const Divider = () => (
  <div style={{ height: "0.5px", background: colors.border, margin: "14px 0" }} />
);
