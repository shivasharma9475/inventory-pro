// client/src/components/common/ToastProvider.jsx
//
// Minimal toast notification system. No new dependency was added for this —
// the project has no toast library installed, and the need here (success/
// error feedback for exports, easily reusable elsewhere later) is simple
// enough that a small self-contained provider is less weight than pulling
// in something like react-hot-toast for four call sites.
//
// Usage:
//   1. Wrap the app once in <ToastProvider> (see App.jsx).
//   2. Anywhere deeper, `const { showToast } = useToast();`
//      showToast("Export complete", "success");
//      showToast("Export failed: ...", "error");
//      showToast("Some informational notice", "info");

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { colors } from "../dashboard/styles/tokens";

const ToastContext = createContext(null);

const VARIANT_STYLES = {
  success: { border: colors.green, icon: "✓" },
  error: { border: colors.red, icon: "✕" },
  info: { border: colors.blue, icon: "ℹ" },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idCounter = useRef(0);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, variant = "info", durationMs = 4500) => {
      const id = ++idCounter.current;
      setToasts((prev) => [...prev, { id, message, variant }]);
      if (durationMs > 0) {
        setTimeout(() => dismissToast(id), durationMs);
      }
      return id;
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}

      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          zIndex: 20000,
          maxWidth: 380,
        }}
      >
        {toasts.map((toast) => {
          const variant = VARIANT_STYLES[toast.variant] || VARIANT_STYLES.info;
          return (
            <div
              key={toast.id}
              onClick={() => dismissToast(toast.id)}
              style={{
                background: "#0d0e14",
                border: `0.5px solid ${colors.border}`,
                borderLeft: `3px solid ${variant.border}`,
                borderRadius: 10,
                padding: "12px 14px",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                cursor: "pointer",
                animation: "fadeDown 0.25s ease both",
              }}
            >
              <span style={{ color: variant.border, fontSize: 14, lineHeight: "18px" }}>
                {variant.icon}
              </span>
              <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, lineHeight: "18px" }}>
                {toast.message}
              </span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider (see App.jsx)");
  }
  return ctx;
}
