import { Routes, Route, Navigate, useOutletContext } from "react-router-dom";

// Auth
import { useAuth } from "./components/hooks/useAuth";

// Public Pages
import Welcome from "./pages/Welcome";
import Register from "./pages/Register";
import OtpPage from "./pages/OtpPage";
import Login from "./pages/LoginPage";
import ResetPassword from "./pages/ResetPasswordPage";
import ActivityHistory from "./components/dashboard/ActivityFeed";

// Dashboard Layout
import DashboardLayout from "./components/dashboard/layout/DashboardLayout";

// Dashboard Pages
import DashboardHome from "./pages/DashboardHome";
import Products from "./pages/Products";
import Billing from "./pages/Billing";
import Staff from "./pages/Staff";
import CompanySettings from "./pages/CompanySettings";
import { ToastProvider } from "./components/common/ToastProvider";


// Protected Route — requires a logged-in user (any role)
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Admin-only Route — nests under DashboardLayout's <Outlet context={{ isAdmin, ... }} />,
// so it must be used as a child of the /dashboard route, never standalone.
// Staff accounts get redirected to the dashboard home instead of seeing the page at all —
// this is on top of (not instead of) the backend's own role check on /api/activities.
function RequireAdmin({ children }) {
  const outletContext = useOutletContext();

  if (!outletContext?.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Welcome />} />
      <Route path="/register" element={<Register />} />
      <Route path="/otp" element={<OtpPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected Dashboard Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="products" element={<Products />} />
        <Route path="billing" element={<Billing />} />
        <Route path="staff" element={<Staff />} />

        {/* Existing Settings Page */}
        <Route
          path="company-settings"
          element={<CompanySettings />}
        />

        {/* New Settings Page */}
        <Route
          path="settings"
          element={<CompanySettings />}
        />

        {/* Activity Feed / History — admin only. Nested here (not as a
            top-level route) so it's both auth-protected via ProtectedRoute
            above AND has access to the isAdmin outlet context RequireAdmin
            needs. This also matches the path Sidebar.jsx already links to. */}
        <Route
          path="activity"
          element={
            <RequireAdmin>
              <ActivityHistory />
            </RequireAdmin>
          }
        />
      </Route>

      {/* Default Redirect */}
      <Route
        path="*"
        element={<Navigate to="/dashboard" replace />}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppRoutes />
    </ToastProvider>
  );
}