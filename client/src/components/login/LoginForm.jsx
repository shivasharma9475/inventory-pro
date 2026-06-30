import { Field } from "../login/ui/Field";
import { PasswordField } from "../login/ui/PasswordField";

export function LoginForm({
  form,
  errors,
  update,
  loading,
  onSubmit,
  onForgot,
}) {
  return (
   <div
  className="flex flex-col gap-5"
  style={{ animation: "fadeDown 0.4s ease both" }}
>
      
    
      {/* Heading */}
      <div className="mb-2">
        <h2 className="text-lg font-light mb-1 text-white">
          Welcome back
        </h2>
        <p className="text-xs font-light text-white/40">
          Sign in to your account to continue
        </p>
      </div>
      {errors.general && (
  <div
    style={{
      background: "rgba(248,113,113,0.1)",
      border: "0.5px solid rgba(248,113,113,0.4)",
      color: "#f87171",
      padding: "10px",
      borderRadius: "8px",
      fontSize: "12px",
    }}
  >
    {errors.general}
  </div>
)}

      {/* Company Code */}
      <div className="flex flex-col gap-1 relative">
        <label
          className="text-xs tracking-widest uppercase font-light"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          Company Code <span style={{ color: "#a78bfa" }}>*</span>
        </label>

        <input
          type="text"
          value={form.companyCode || ""} // 🔥 SAFE VALUE
          onChange={update("companyCode")}
          placeholder="Enter your company (e.g. tcs)"
          autoComplete="off" // 🔥 disable browser fill
          className="w-full rounded-lg px-4 py-3 text-sm font-light outline-none transition-all duration-200"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: errors.companyCode
              ? "0.5px solid rgba(248,113,113,0.6)"
              : "0.5px solid rgba(255,255,255,0.12)",
            color: "#fff",
            fontFamily: "'DM Sans', sans-serif",
          }}
          onFocus={(e) => {
            e.target.style.border = "0.5px solid rgba(167,139,250,0.6)";
            e.target.style.background = "rgba(167,139,250,0.06)";
          }}
          onBlur={(e) => {
            e.target.style.border = errors.companyCode
              ? "0.5px solid rgba(248,113,113,0.6)"
              : "0.5px solid rgba(255,255,255,0.12)";
            e.target.style.background = "rgba(255,255,255,0.05)";
          }}
        />

        {errors.companyCode && (
          <p className="text-xs font-light mt-1" style={{ color: "#f87171" }}>
            {errors.companyCode}
          </p>
        )}
      </div>

      {/* Email */}
      <Field
        label="Email Address"
        id="email"
        type="email"
        placeholder="you@company.com"
        value={form.email || ""} // 🔥 SAFE
        onChange={update("email")}
        error={errors.email}
        required
        autoComplete="new-email" // 🔥 prevent autofill
      />

      {/* Password */}
      <div className="flex flex-col gap-1">
        <PasswordField
          label="Password"
          id="password"
          placeholder="Your password"
          value={form.password || ""} // 🔥 SAFE
          onChange={update("password")}
          error={errors.password}
          required
          autoComplete="new-password" // 🔥 prevent autofill
        />

        <div className="flex justify-end mt-1">
          <button
            type="button"
            onClick={onForgot}
            className="text-xs underline text-purple-400"
          >
            Forgot password?
          </button>
        </div>
      </div>

      {/* Submit */}
      <button
        type="button" // 💣 THIS LINE FIXES EVERYTHING
        onClick={onSubmit}
        disabled={loading}
        className="w-full py-3 rounded-xl text-sm text-white transition-all duration-200"
        style={{
          background: loading
            ? "rgba(124,58,237,0.5)"
            : "linear-gradient(135deg,#7c3aed,#3b82f6)",
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "SIGNING IN..." : "SIGN IN"}
      </button>
    </div>
  );
}