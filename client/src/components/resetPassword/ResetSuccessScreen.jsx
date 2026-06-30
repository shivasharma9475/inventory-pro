import { Link } from "react-router-dom";

export function ResetSuccessScreen() {
  return (
    <div
      className="flex flex-col items-center gap-5 py-4 text-center"
      style={{ animation: "fadeDown 0.4s ease both" }}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{
          background: "rgba(167,139,250,0.1)",
          border: "0.5px solid rgba(167,139,250,0.35)",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path
            d="M4 14l7 7L24 7"
            stroke="#a78bfa"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div>
        <p className="text-sm font-light mb-1" style={{ color: "#fff" }}>
          Password updated
        </p>
        <p className="text-xs font-light" style={{ color: "rgba(255,255,255,0.35)" }}>
          Your password has been reset successfully.
          <br />You can now sign in with your new password.
        </p>
      </div>

      <Link
        to="/login"
        className="w-full py-3 rounded-xl text-sm font-light tracking-widest text-white text-center transition-all duration-200 hover:opacity-85 active:scale-98 mt-2"
        style={{
          background: "linear-gradient(135deg,#7c3aed,#3b82f6)",
          fontFamily: "'DM Sans',sans-serif",
          letterSpacing: "0.12em",
          display: "block",
        }}
      >
        GO TO SIGN IN
      </Link>
    </div>
  );
}