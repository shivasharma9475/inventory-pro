export function AccountSummary({ companyName, email, companyCode }) {
  return (
    <div
      className="rounded-xl p-4 text-xs font-light flex flex-col gap-2"
      style={{
        background: "rgba(167,139,250,0.06)",
        border: "0.5px solid rgba(167,139,250,0.15)",
      }}
    >
      <p
        style={{ color: "rgba(255,255,255,0.4)" }}
        className="tracking-wider uppercase text-xs mb-1"
      >
        Account summary
      </p>

      <div className="flex justify-between">
        <span style={{ color: "rgba(255,255,255,0.35)" }}>Company</span>
        <span style={{ color: "rgba(255,255,255,0.7)" }}>{companyName || "—"}</span>
      </div>

      <div className="flex justify-between">
        <span style={{ color: "rgba(255,255,255,0.35)" }}>Email</span>
        <span style={{ color: "rgba(255,255,255,0.7)" }}>{email || "—"}</span>
      </div>

      <div className="flex justify-between">
        <span style={{ color: "rgba(255,255,255,0.35)" }}>Company Code</span>
        <span style={{ color: "#a78bfa", textTransform: "capitalize" }}>{companyCode}</span>
      </div>
    </div>
  );
}