import { Field } from "./Field";

export function SelectField({
  label,
  id,
  value,
  onChange,
  error,
  options,
  required,
}) {
  return (
    <Field label={label} id={id} error={error} required={required}>
      <select
        id={id}
        value={value}
        onChange={onChange}
        className="w-full rounded-lg px-4 py-3 text-sm font-light outline-none transition-all duration-200 appearance-none"
        style={{
          background: "rgba(255,255,255,0.05)",
          border: error
            ? "0.5px solid rgba(248,113,113,0.6)"
            : "0.5px solid rgba(255,255,255,0.12)",
          color: value ? "#fff" : "rgba(255,255,255,0.3)",
          fontFamily: "'DM Sans', sans-serif",
          cursor: "pointer",
        }}
        onFocus={(e) => {
          e.target.style.border = "0.5px solid rgba(167,139,250,0.6)";
          e.target.style.background = "rgba(167,139,250,0.06)";
        }}
        onBlur={(e) => {
          e.target.style.border = error
            ? "0.5px solid rgba(248,113,113,0.6)"
            : "0.5px solid rgba(255,255,255,0.12)";
          e.target.style.background = "rgba(255,255,255,0.05)";
        }}
      >
        <option value="" disabled style={{ background: "#1b2735" }}>
          Select…
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: "#1b2735" }}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}