import { NavLink } from "react-router-dom";
import { colors } from "../styles/tokens";

const NAV = [
  {
    to: "/dashboard",
    label: "Dashboard",
    end: true,
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".4"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".4"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".9"/></svg>,
  },
  {
    to: "/dashboard/products",
    label: "Products",
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M2 4l6-2 6 2v6l-6 4-6-4V4z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/><path d="M8 2v10M2 4l6 4 6-4" stroke="currentColor" strokeWidth="1.1"/></svg>,
  },
  {
    to: "/dashboard/billing",
    label: "Billing",
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.1"/><path d="M5 5h6M5 8h4M5 11h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  },
  {
    to: "/dashboard/staff",
    label: "Staff",
    adminOnly: true,
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.1"/><path d="M1 13c0-2.76 2.24-4 5-4s5 1.24 5 4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/><path d="M12 7v4M10 9h4" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  },

  {
  to: "/dashboard/activity",
  label: "Activity",
  adminOnly: true,
  icon: (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 8h2l1.5-3 3 6 2-4H14"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
},

  {
    to: "/dashboard/company-settings",
    label: "Settings",
    icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.1"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>,
  },
];

export default function Sidebar({ isAdmin, collapsed, onToggle }) {
  const items = NAV.filter((i) => !i.adminOnly || isAdmin);

  return (
    <aside style={{
      width: collapsed ? 56 : 210,
      minHeight: "100vh", flexShrink: 0,
      background: "rgba(255,255,255,0.015)",
      borderRight: `0.5px solid ${colors.border}`,
      display: "flex", flexDirection: "column",
      transition: "width 0.22s ease",
      position: "sticky", top: 0, height: "100vh", overflow: "hidden",
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? "18px 0" : "18px 18px",
        borderBottom: `0.5px solid ${colors.border}`,
        display: "flex", alignItems: "center", gap: 9,
        justifyContent: collapsed ? "center" : "flex-start",
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
          <rect x="1" y="1" width="7.5" height="7.5" rx="1.5" fill="#a78bfa" opacity=".9"/>
          <rect x="11.5" y="1" width="7.5" height="7.5" rx="1.5" fill="#60a5fa" opacity=".9"/>
          <rect x="1" y="11.5" width="7.5" height="7.5" rx="1.5" fill="#60a5fa" opacity=".55"/>
          <rect x="11.5" y="11.5" width="7.5" height="7.5" rx="1.5" fill="#a78bfa" opacity=".55"/>
        </svg>
        {!collapsed && (
          <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: 300, letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
            Inventory Pro
          </span>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "10px 0" }}>
        {items.map((item) => (
          <NavLink
            key={item.to} to={item.to} end={item.end}
            style={({ isActive }) => ({
              display: "flex", alignItems: "center",
              gap: 9,
              padding: collapsed ? "10px 0" : "10px 18px",
              justifyContent: collapsed ? "center" : "flex-start",
              color: isActive ? colors.purple : "rgba(255,255,255,0.3)",
              background: isActive ? "rgba(167,139,250,0.07)" : "transparent",
              borderRight: isActive ? `2px solid ${colors.purple}` : "2px solid transparent",
              textDecoration: "none", fontSize: 13, fontWeight: 300,
              letterSpacing: "0.02em", transition: "all 0.15s",
              whiteSpace: "nowrap",
            })}
          >
            {item.icon}
            {!collapsed && <span>{item.label}</span>}
            {!collapsed && item.adminOnly && (
              <span style={{ marginLeft: "auto", fontSize: 9, letterSpacing: "0.08em", color: "rgba(167,139,250,0.55)", background: "rgba(167,139,250,0.08)", borderRadius: 4, padding: "1px 5px" }}>
                ADMIN
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        style={{
          margin: "10px auto 14px", width: 28, height: 28, borderRadius: 7,
          background: "rgba(255,255,255,0.03)", border: `0.5px solid ${colors.border}`,
          color: "rgba(255,255,255,0.25)", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d={collapsed ? "M3 2l5 4-5 4" : "M9 2L4 6l5 4"} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </aside>
  );
}