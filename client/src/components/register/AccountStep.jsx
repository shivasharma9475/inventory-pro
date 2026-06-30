import { Field } from "./ui/Field";
import { PasswordField } from "./ui/PasswordField";

export function AccountStep({ form, errors, update, onNext }) {
  return (
    <div className="flex flex-col gap-5" style={{ animation: "fadeDown 0.4s ease both" }}>

      <Field
        label="Company Name"
        id="companyName"
        placeholder="Enter your company name."
        value={form.companyName}
        onChange={update("companyName")}
        error={errors.companyName}
        required
      />

      <Field
        label="Email Address"
        id="email"
        type="email"
        placeholder="Enter your E-mail address."
        value={form.email}
        onChange={update("email")}
        error={errors.email}
        required
      />

      <PasswordField
        label="Password"
        id="password"
        placeholder="Enter Min. 8 characters Password"
        value={form.password}
        onChange={update("password")}
        error={errors.password}
        required
      />

      <PasswordField
        label="Confirm Password"
        id="confirmPassword"
        placeholder="Re-enter password"
        value={form.confirmPassword}
        onChange={update("confirmPassword")}
        error={errors.confirmPassword}
        required
      />

      <button
        type="button"
        onClick={onNext}
        className="w-full py-3 rounded-xl text-sm font-light tracking-widest text-white mt-2 transition-all duration-200 hover:opacity-85 active:scale-98"
        style={{
          background: "linear-gradient(135deg,#7c3aed,#3b82f6)",
          fontFamily: "'DM Sans',sans-serif",
          letterSpacing: "0.12em",
        }}
      >
        CONTINUE →
      </button>
    </div>
  );
}