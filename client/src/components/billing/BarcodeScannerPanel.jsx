// client/src/components/billing/BarcodeScannerPanel.jsx
//
// Two scan modes:
//  1. USB/Bluetooth HID scanner — works globally via useBarcodeScanner (no UI needed,
//     just plug in and scan).
//  2. Camera scanner — opens a webcam modal using the shared CameraScannerModal
//     (components/scanner/CameraScannerModal.jsx), which also backs the Products
//     page's scan-to-add flow. Consolidated from a previous near-duplicate
//     implementation so fixes (double-fire guard, DOM cleanup, etc.) only need
//     to be made once.
//
// On a successful scan, looks up the product and calls `onProductFound(product)`
// immediately (auto-adds to cart in Billing.jsx) — no extra confirmation step.
// If no product matches, calls `onNotFound(code)`.

import { useState, useCallback } from "react";
import useBarcodeScanner from "../hooks/useBarcodeScanner";
import { getProductByBarcode } from "../../services/productService";
import { card, colors, btnPrimary } from "../dashboard/styles/tokens";
import CameraScannerModal from "../scanner/CameraScannerModal";

// ── Defensive unwrap ─────────────────────────────────────────────────────────
// We don't know the exact shape `safeRequest` returns (could be the raw axios
// response, an unwrapped `.data`, or something else). This tries every
// reasonable shape until it finds an actual product object (something with
// an `_id`). This avoids silently failing when the wrapper shape changes.
function extractProduct(res) {
  if (!res) return null;
  const candidates = [
    res,
    res.data,
    res.data?.data,
    res.data?.product,
    res.product,
  ];
  for (const c of candidates) {
    if (c && typeof c === "object" && c._id) return c;
  }
  return null;
}

export default function BarcodeScannerPanel({ onProductFound, onNotFound, enabled = true }) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);

  const lookup = useCallback(
    async (code) => {
      setScanning(true);
      setError(null);
      try {
        const res = await getProductByBarcode(code);
        const product = extractProduct(res);

        if (process.env.NODE_ENV !== "production") {
          // One-time debug aid — remove once shape is confirmed.
          console.log("[BarcodeScannerPanel] raw response:", res, "→ extracted:", product);
        }

        if (product) {
          onProductFound?.(product);
        } else {
          const msg = `No product found for "${code}"`;
          setError(msg);
          onNotFound?.(code);
        }
      } catch (err) {
        const msg = err?.response?.data?.message || err?.message || `No product found for "${code}"`;
        setError(msg);
        onNotFound?.(code);
      } finally {
        setScanning(false);
      }
    },
    [onProductFound, onNotFound]
  );

  // ── USB/Bluetooth HID scanner — listens globally, auto-fires on Enter ─────
  useBarcodeScanner(lookup, { enabled: enabled && !cameraOpen });

  return (
    <div style={{ ...card, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
      {/* USB scanner status */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span
          style={{
            width: 8, height: 8, borderRadius: "50%",
            background: enabled ? colors.green : "rgba(255,255,255,0.2)",
            boxShadow: enabled ? `0 0 6px ${colors.green}` : "none",
            display: "inline-block",
          }}
        />
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
          {scanning ? "Looking up…" : "Scanner ready — scan a barcode"}
        </span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Camera scan button */}
      <button
        onClick={() => setCameraOpen(true)}
        style={{
          ...btnPrimary, padding: "6px 12px", fontSize: 12,
          background: "rgba(255,255,255,0.06)", border: `0.5px solid ${colors.border}`,
        }}
      >
        📷 Scan with Camera
      </button>

      {error && (
        <span style={{ fontSize: 11, color: colors.red || "#f87171" }}>
          {error}
        </span>
      )}

      {cameraOpen && (
        <CameraScannerModal
          title="Scan Barcode"
          hint="Point your camera at a product barcode — it adds to cart automatically"
          // As soon as the camera detects a barcode, close the modal and
          // immediately run the lookup → onProductFound fires → Billing.jsx
          // adds it to the cart right away, with zero extra clicks.
          onDetected={(code) => {
            setCameraOpen(false);
            lookup(code);
          }}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </div>
  );
}