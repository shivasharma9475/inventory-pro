import { colors } from "../styles/tokens";

export default function Navbar({ user, onLogout }) {
  const isAdmin = user?.role === "admin";

  const logoUrl = user?.companyLogo?.url;


  return (
    <header style={{
      height: 54,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 22px",
      background: "rgba(255,255,255,0.015)",
      borderBottom: `0.5px solid ${colors.border}`,
      position: "sticky",
      top: 0,
      zIndex: 50,
      backdropFilter: "blur(12px)",
    }}>

      {/* 🔥 LEFT: Logo + Company Name */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

        {/* Logo */}
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {logoUrl ? (
            <img
              src={logoUrl}   // ✅ direct ImageKit URL
              alt="logo"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
              onError={(e) => (e.target.style.display = "none")}
            />
          ) : (
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>
              {user?.companyName?.[0] || "A"}
            </span>
          )}
        </div>

        {/* Company Name */}
        <p style={{
          color: "rgba(255,255,255,0.35)",
          fontSize: 12,
          fontWeight: 300,
          letterSpacing: "0.04em"
        }}>
          {user?.companyName || "Dashboard"}
        </p>
      </div>

      {/* 🔥 RIGHT */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

        <span style={{
          fontSize: 9,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          padding: "3px 9px",
          borderRadius: 20,
          background: isAdmin ? "rgba(167,139,250,0.1)" : "rgba(96,165,250,0.1)",
          border: `0.5px solid ${isAdmin ? "rgba(167,139,250,0.25)" : "rgba(96,165,250,0.25)"}`,
          color: isAdmin ? colors.purple : colors.blue,
        }}>
          {user?.role}
        </span>

        <span style={{
          color: "rgba(255,255,255,0.3)",
          fontSize: 12,
          fontWeight: 300
        }}>
          {user?.email}
        </span>

        <button
          onClick={onLogout}
          style={{
            background: "rgba(248,113,113,0.07)",
            border: "0.5px solid rgba(248,113,113,0.2)",
            borderRadius: 8,
            color: "rgba(248,113,113,0.7)",
            fontSize: 11,
            padding: "5px 12px",
            cursor: "pointer",
          }}
        >
          Logout
        </button>

      </div>
    </header>
  );
}