import { card, colors, inputBase, inputError } from "../styles/tokens";

// ── StatCard ──────────────────────────────────────────────
export function StatCard({ label, value, icon, color = colors.purple, sub, delay = 0 }) {
  return (
    <div className="anim" style={{ ...card, padding: 18, animationDelay: `${delay}s` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {label}
        </p>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}18`, border: `0.5px solid ${color}28`, display: "flex", alignItems: "center", justifyContent: "center", color }}>
          {icon}
        </div>
      </div>
      <p style={{ fontSize: 24, color: "#fff", fontWeight: 300, lineHeight: 1 }}>{value ?? "—"}</p>
      {sub && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.22)", marginTop: 6 }}>{sub}</p>}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────
import { createPortal } from "react-dom";

export function Modal({ title, children, onClose }) {
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.6)",
        zIndex: 9999,
      }}
    >
      {/* 🔥 FORCE CENTER */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)", // 💣 GUARANTEED CENTER

          width: "100%",
          maxWidth: "420px",
          background: "#0d0e16",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h3 style={{ color: "#fff" }}>{title}</h3>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#aaa",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>

        {children}
      </div>
    </div>,
    document.body // 🔥 VERY IMPORTANT
  );
}

// ── FormField ─────────────────────────────────────────────
export function FormField({
  label,
  id,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  required,
  options
}) {
  const style = error ? inputError : inputBase;

  const handleChange = (e) => {
    if (type === "number") {
      // ✅ convert to number safely
      onChange({
        target: {
          name: name || id,
          value: e.target.value === "" ? "" : Number(e.target.value),
        },
      });
    } else {
      onChange({
        target: {
          name: name || id,
          value: e.target.value,
        },
      });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && (
        <label
          htmlFor={id}
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.35)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {label}{" "}
          {required && <span style={{ color: colors.purple }}>*</span>}
        </label>
      )}

      {type === "select" ? (
        <select
          id={id}
          name={name || id}
          value={value ?? ""} // ✅ FIX uncontrolled warning
          onChange={handleChange}
          style={{ ...style, cursor: "pointer", appearance: "none" }}
          onFocus={(e) => {
            e.target.style.borderColor = "rgba(167,139,250,0.45)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error
              ? "rgba(248,113,113,0.5)"
              : "rgba(255,255,255,0.12)";
          }}
        >
          <option value="" style={{ background: "#0d0e16" }}>
            Select…
          </option>
          {options?.map((o) => (
            <option
              key={o.value ?? o}
              value={o.value ?? o}
              style={{ background: "#0d0e16" }}
            >
              {o.label ?? o}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={name || id}
          type={type}
          placeholder={placeholder}
          value={value ?? ""} // ✅ FIX uncontrolled warning
          onChange={handleChange}
          style={style}
          onFocus={(e) => {
            e.target.style.borderColor = "rgba(167,139,250,0.45)";
            e.target.style.background = "rgba(167,139,250,0.04)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error
              ? "rgba(248,113,113,0.5)"
              : "rgba(255,255,255,0.12)";
            e.target.style.background = "rgba(255,255,255,0.05)";
          }}
        />
      )}

      {error && (
        <p style={{ fontSize: 11, color: colors.red }}>{error}</p>
      )}
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
      <div>
        <h1 style={{ fontSize: 18, color: "#fff", fontWeight: 300, marginBottom: 3 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", fontWeight: 300 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Empty / Loading states ────────────────────────────────
export function LoadingState() {
  return <div style={{ padding: 52, textAlign: "center" }}><span className="loader" /></div>;
}

export function EmptyState({ message = "No data found." }) {
  return <div style={{ padding: 52, textAlign: "center", color: "rgba(255,255,255,0.18)", fontSize: 13 }}>{message}</div>;
}

// ── Badge ─────────────────────────────────────────────────
export function Badge({ label, color = colors.purple }) {
  return (
    <span style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", padding: "2px 7px", borderRadius: 4, background: `${color}18`, border: `0.5px solid ${color}28`, color }}>
      {label}
    </span>
  );
}