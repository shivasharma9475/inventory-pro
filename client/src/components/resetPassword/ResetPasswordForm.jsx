import { PasswordField } from "../resetPassword/ui/PasswordField";

export function ResetPasswordForm({ form, errors, update, loading, onSubmit }) {
  return (
    <div className="flex flex-col gap-5" style={{ animation: "fadeDown 0.4s ease both" }}>

      {/* Heading */}
      <div className="mb-2">
        <h2
          className="text-lg font-light mb-1"
          style={{ color: "#fff", fontFamily: "'DM Sans', sans-serif" }}
        >
          Set new password
        </h2>
        <p className="text-xs font-light" style={{ color: "rgba(255,255,255,0.35)" }}>
          Must be at least 8 characters
        </p>
      </div>

      <PasswordField
        label="New Password"
        id="password"
        placeholder="Min. 8 characters"
        value={form.password}
        onChange={update("password")}
        error={errors.password}
        required
      />

      <PasswordField
        label="Confirm Password"
        id="confirmPassword"
        placeholder="Re-enter new password"
        value={form.confirmPassword}
        onChange={update("confirmPassword")}
        error={errors.confirmPassword}
        required
      />

      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="w-full py-3 rounded-xl text-sm font-light tracking-widest text-white mt-1 transition-all duration-200 hover:opacity-85 active:scale-98 flex items-center justify-center gap-2"
        style={{
          background: loading ? "rgba(124,58,237,0.5)" : "linear-gradient(135deg,#7c3aed,#3b82f6)",
          fontFamily: "'DM Sans',sans-serif",
          letterSpacing: "0.12em",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? <><span className="loader" /> UPDATING…</> : "UPDATE PASSWORD"}
      </button>
    </div>
  );
}