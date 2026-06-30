import { useState } from "react";
import { Field } from "./Field";

export function PasswordField({
  label,
  id,
  placeholder,
  value,
  onChange,
  error,
  required,
  autoComplete = "new-password",
}) {
  const [show, setShow] = useState(false);

  return (
    <Field label={label} id={id} error={error} required={required}>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          className="w-full rounded-lg px-4 py-3 pr-12 text-sm font-light outline-none transition-all duration-200"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: error
              ? "0.5px solid rgba(248,113,113,0.6)"
              : "0.5px solid rgba(255,255,255,0.12)",
            color: "#fff",
            fontFamily: "'DM Sans', sans-serif",
            caretColor: "#a78bfa",
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
        />
        <button
          type="button"
          onClick={() => setShow((p) => !p)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-light tracking-wider"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          {show ? "HIDE" : "SHOW"}
        </button>
      </div>
      {error && (
        <p className="text-xs font-light mt-1" style={{ color: "#f87171" }}>
          {error}
        </p>
      )}
    </Field>
  );
}