import { Field } from "./ui/Field";
import { SelectField } from "./ui/SelectField";
import { AccountSummary } from "./AccountSummary";
import { countryOptions } from "./utils/constants";

export function LocationStep({ form, errors, update, onBack, loading }) {
  return (
    <div className="flex flex-col gap-5" style={{ animation: "fadeDown 0.4s ease both" }}>
      <SelectField
        label="Country"
        id="country"
        value={form.country}
        onChange={update("country")}
        error={errors.country}
        options={countryOptions}
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="State"
          id="state"
          placeholder="e.g. Maharashtra"
          value={form.state}
          onChange={update("state")}
          error={errors.state}
          required
        />
        <Field
          label="City"
          id="city"
          placeholder="e.g. Mumbai"
          value={form.city}
          onChange={update("city")}
          error={errors.city}
          required
        />
      </div>

      <Field
        label="Phone Number"
        id="phone"
        type="tel"
        placeholder="+91XXXXXXXXXX"
        value={form.phone}
        onChange={update("phone")}
        error={errors.phone}
        required
      />

      <p className="text-xs font-light" style={{ color: "rgba(255,255,255,0.3)" }}>
        Format: country code + number (e.g. +919876543210)
      </p>

      <div style={{ height: "0.5px", background: "rgba(255,255,255,0.08)" }} />

      <AccountSummary
        companyName={form.companyName}
        email={form.email}
        companyCode={form.companyCode}
      />

      <div className="flex gap-3 mt-1">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 rounded-xl text-sm font-light tracking-widest transition-all duration-200 hover:bg-white/10"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "0.5px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.6)",
            fontFamily: "'DM Sans',sans-serif",
            letterSpacing: "0.1em",
          }}
        >
          ← BACK
        </button>

        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 rounded-xl text-sm font-light tracking-widest text-white transition-all duration-200 hover:opacity-85 active:scale-98 flex items-center justify-center gap-2"
          style={{
            background: loading
              ? "rgba(124,58,237,0.5)"
              : "linear-gradient(135deg,#7c3aed,#3b82f6)",
            fontFamily: "'DM Sans',sans-serif",
            letterSpacing: "0.12em",
          }}
        >
          {loading ? (
            <>
              <span className="loader" />
              CREATING…
            </>
          ) : (
            "CREATE ACCOUNT"
          )}
        </button>
      </div>
    </div>
  );
}