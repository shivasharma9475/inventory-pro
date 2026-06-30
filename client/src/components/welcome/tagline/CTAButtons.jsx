import { Link } from "react-router-dom";

export default function CTAButtons() {
  return (
    <div
      className="flex flex-col items-center gap-4 mb-12 anim-fade-up"
      style={{ animationDelay: "0.44s" }}
    >
      {/* Primary row */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <Link
          to="/register"
          className="btn-primary text-white rounded-full px-8 py-3 text-sm font-light tracking-wider inline-block text-center hover:scale-105 transition"
          style={{ fontFamily: "'Lato', sans-serif" }}
        >
          Get Started →
        </Link>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3" style={{ width: 260 }}>
        <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.08)" }} />
        <span
          className="text-xs font-light tracking-widest uppercase"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          or sign in as
        </span>
        <div style={{ flex: 1, height: "0.5px", background: "rgba(255,255,255,0.08)" }} />
      </div>

      {/* 🔥 Role-based Login Buttons */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        
        {/* ADMIN */}
        <Link
          to="/login?role=admin"
          className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-light tracking-widest transition-all duration-200 hover:scale-105 hover:shadow-lg"
          style={{
            fontFamily: "'Lato', sans-serif",
            background: "rgba(167,139,250,0.08)",
            border: "0.5px solid rgba(167,139,250,0.3)",
            color: "rgba(167,139,250,0.9)",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.1" />
            <path d="M2 12c0-2.76 2.24-4 5-4s5 1.24 5 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
            <circle cx="11.5" cy="3.5" r="1.5" fill="currentColor" opacity="0.6" />
          </svg>
          Login as Admin
        </Link>

        {/* STAFF */}
        <Link
          to="/login?role=staff"
          className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-xs font-light tracking-widest transition-all duration-200 hover:scale-105 hover:shadow-lg"
          style={{
            fontFamily: "'Lato', sans-serif",
            background: "rgba(96,165,250,0.08)",
            border: "0.5px solid rgba(96,165,250,0.3)",
            color: "rgba(96,165,250,0.9)",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="4.5" r="2.5" stroke="currentColor" strokeWidth="1.1" />
            <path d="M2 12c0-2.76 2.24-4 5-4s5 1.24 5 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
          Login as Staff
        </Link>
      </div>

      {/* 🔥 Info hint */}
      <p className="text-xs text-white/20 mt-2 text-center">
        Admin has full access • Staff has limited access
      </p>
    </div>
  );
}