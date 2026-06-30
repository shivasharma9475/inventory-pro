export function Field({
  label, id, type = "text", placeholder,
  value, onChange, error, children, required,
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-xs tracking-widest uppercase font-light"
        style={{ color: "rgba(255,255,255,0.45)" }}
      >
        {label} {required && <span style={{ color: "#a78bfa" }}>*</span>}
      </label>

      {children || (
        <input
          id={id} type={type} placeholder={placeholder}
          value={value} onChange={onChange} autoComplete="off"
          className="w-full rounded-lg px-4 py-3 text-sm font-light outline-none transition-all duration-200"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: error ? "0.5px solid rgba(248,113,113,0.6)" : "0.5px solid rgba(255,255,255,0.12)",
            color: "#fff", fontFamily: "'DM Sans', sans-serif", caretColor: "#a78bfa",
          }}
          onFocus={(e) => { e.target.style.border = "0.5px solid rgba(167,139,250,0.6)"; e.target.style.background = "rgba(167,139,250,0.06)"; }}
          onBlur={(e) => { e.target.style.border = error ? "0.5px solid rgba(248,113,113,0.6)" : "0.5px solid rgba(255,255,255,0.12)"; e.target.style.background = "rgba(255,255,255,0.05)"; }}
        />
      )}

      {error && <p className="text-xs font-light" style={{ color: "#f87171" }}>{error}</p>}
    </div>
  );
}