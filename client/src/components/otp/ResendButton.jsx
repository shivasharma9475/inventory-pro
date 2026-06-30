export function ResendButton({ isDisabled, label, onClick }) {
  return (
    <div className="text-center">
      <p
        className="text-xs font-light mb-2"
        style={{ color: "rgba(255,255,255,0.3)" }}
      >
        Didn't receive the code?
      </p>
      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        className="text-sm font-light tracking-wider transition-all duration-200"
        style={{
          color: isDisabled ? "rgba(255,255,255,0.2)" : "rgba(167,139,250,0.8)",
          fontFamily: "'DM Sans', sans-serif",
          cursor: isDisabled ? "default" : "pointer",
        }}
      >
        {isDisabled ? `Resend code (${label})` : "Resend code"}
      </button>
    </div>
  );
}