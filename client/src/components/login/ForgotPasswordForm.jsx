import { Field } from "../login/ui/Field";

export function ForgotPasswordForm({ form, errors, update, loading, sent, onSubmit, onBack }) {
  // Success state — email sent
  if (sent) {
    return (
      <div
        className="flex flex-col items-center gap-5 py-4 text-center"
        style={{ animation: "fadeDown 0.4s ease both" }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "rgba(167,139,250,0.1)", border: "0.5px solid rgba(167,139,250,0.35)" }}
        >
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M4 14l7 7L24 7" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-light mb-1" style={{ color: "#fff" }}>Check your inbox</p>
          <p className="text-xs font-light" style={{ color: "rgba(255,255,255,0.35)" }}>
            We sent a password reset link to
          </p>
          <p className="text-xs font-light mt-0.5" style={{ color: "rgba(167,139,250,0.8)" }}>
            {form.email}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-light underline underline-offset-2 transition-opacity hover:opacity-80 mt-2"
          style={{ color: "rgba(167,139,250,0.7)", fontFamily: "'DM Sans', sans-serif" }}
        >
          ← Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5" style={{ animation: "fadeDown 0.4s ease both" }}>

      {/* Back button + heading */}
      <div className="mb-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-light mb-4 transition-opacity hover:opacity-70"
          style={{ color: "rgba(255,255,255,0.4)", fontFamily: "'DM Sans', sans-serif" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to sign in
        </button>
        <h2
          className="text-lg font-light mb-1"
          style={{ color: "#fff", fontFamily: "'DM Sans', sans-serif" }}
        >
          Reset password
        </h2>
        <p className="text-xs font-light" style={{ color: "rgba(255,255,255,0.35)" }}>
          Enter your email and we'll send you a reset link
        </p>
      </div>

      <Field
        label="Email Address"
        id="forgot-email"
        type="email"
        placeholder="you@company.com"
        value={form.email}
        onChange={update("email")}
        error={errors.email}
        required
      />

      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="w-full py-3 rounded-xl text-sm font-light tracking-widest text-white transition-all duration-200 hover:opacity-85 active:scale-98 flex items-center justify-center gap-2"
        style={{
          background: loading ? "rgba(124,58,237,0.5)" : "linear-gradient(135deg,#7c3aed,#3b82f6)",
          fontFamily: "'DM Sans',sans-serif",
          letterSpacing: "0.12em",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? <><span className="loader" /> SENDING…</> : "SEND RESET LINK"}
      </button>
    </div>
  );
}