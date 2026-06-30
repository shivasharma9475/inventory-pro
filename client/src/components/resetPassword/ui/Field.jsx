export function Field({ label, id, error, children, required }) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-xs tracking-widest uppercase font-light"
        style={{ color: "rgba(255,255,255,0.45)" }}
      >
        {label} {required && <span style={{ color: "#a78bfa" }}>*</span>}
      </label>
      {children}
      {error && <p className="text-xs font-light" style={{ color: "#f87171" }}>{error}</p>}
    </div>
  );
}