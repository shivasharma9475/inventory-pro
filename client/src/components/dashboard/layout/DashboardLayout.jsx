import { useState } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { globalStyles } from "../styles/tokens";
import ChatWidget from "../../chat/ChatWidget";

export default function DashboardLayout() {
  const { user, isAdmin, loading, logout, refreshUser, setUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#090a0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span className="loader" />
      </div>
    );
  }

if (!user) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#090a0f",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#fff"
    }}>
      Loading user...
    </div>
  );
}
  return (
    <>
      <style>{globalStyles}</style>
      <div style={{ display: "flex", minHeight: "100vh", background: "#090a0f" }}>
        <Sidebar isAdmin={isAdmin} collapsed={collapsed} onToggle={() => setCollapsed((p) => !p)} />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
          <Navbar user={user} onLogout={logout} />
          <main style={{ flex: 1, overflowY: "auto", padding: 22 }}>
            <Outlet context={{ user, setUser, isAdmin, refreshUser }} />
          </main>
        </div>
        <ChatWidget />
      </div>
    </>
  );
}