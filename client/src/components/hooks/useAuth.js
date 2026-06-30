import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMe } from "../../services/authService";
import { connectSocket, disconnectSocket } from "../../socket";

export function useAuth() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await getMe();
      const freshUser = res.data.user;
      setUser(freshUser);
      localStorage.setItem("user", JSON.stringify(freshUser));

      // Token is confirmed valid by the server — safe to open the
      // real-time connection now (it's a no-op if already connected).
      connectSocket();
    } catch (error) {
      console.error("Failed to refresh user:", error);
      // If token is invalid, logout
      localStorage.clear();
      disconnectSocket();
      window.location.href = "/login"; // Force redirect
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const stored = localStorage.getItem("user");
        const token = localStorage.getItem("token");
        if (!stored || !token) {
          window.location.href = "/login";
          return;
        }

        // Try to refresh user data from server
        await refreshUser();
      } catch {
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const logout = () => {
    localStorage.clear();
    disconnectSocket();
    window.location.href = "/login";
  };

  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";

  return { user, setUser, isAdmin, isStaff, loading, logout, refreshUser };
}