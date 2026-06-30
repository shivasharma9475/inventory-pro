// client/src/components/products/ScanToAddButton.jsx
//
// Button used on the Products page (admin only) to scan a barcode and:
//   - if a product with that barcode already exists → onExistingFound(product, code)
//     (Products.jsx shows a Quick Restock / Edit prompt immediately)
//   - if no product matches → onNewBarcode(code)
//     (Products.jsx opens the Add form pre-filled with the scanned barcode, immediately)
//
// Both paths fire automatically as soon as the camera detects a barcode —
// no extra "confirm" click needed.

import { useState, useCallback } from "react";
import CameraScannerModal from "../scanner/CameraScannerModal";
import { getProductByBarcode } from "../../services/productService";
import { btnGhost, colors } from "../dashboard/styles/tokens";

// ── Defensive unwrap ─────────────────────────────────────────────────────────
// We don't know the exact shape `safeRequest` returns. Try every reasonable
// shape until something with an `_id` (an actual product) is found.
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

export default function ScanToAddButton({ onExistingFound, onNewBarcode }) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState(null);

  const handleDetected = useCallback(
    async (code) => {
      setCameraOpen(false);
      setLooking(true);
      setError(null);
      try {
        const res = await getProductByBarcode(code);
        const product = extractProduct(res);

        if (process.env.NODE_ENV !== "production") {
          console.log("[ScanToAddButton] raw response:", res, "→ extracted:", product);
        }

        if (product) {
          onExistingFound?.(product, code);
        } else {
          onNewBarcode?.(code);
        }
      } catch (err) {
        // 404 / not found → treat as a brand-new barcode, open Add form
        onNewBarcode?.(code);
      } finally {
        setLooking(false);
      }
    },
    [onExistingFound, onNewBarcode]
  );

  return (
    <>
      <button
        onClick={() => setCameraOpen(true)}
        disabled={looking}
        style={{
          ...btnGhost,
          padding: "7px 13px",
          fontSize: 12,
          opacity: looking ? 0.6 : 1,
        }}
        title="Scan a barcode to add or restock a product"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ marginRight: 4 }}>
          <rect x="1" y="2" width="1.4" height="8" fill="currentColor" />
          <rect x="3" y="2" width="0.8" height="8" fill="currentColor" />
          <rect x="4.5" y="2" width="1.4" height="8" fill="currentColor" />
          <rect x="6.5" y="2" width="0.8" height="8" fill="currentColor" />
          <rect x="8" y="2" width="1.4" height="8" fill="currentColor" />
          <rect x="10" y="2" width="0.8" height="8" fill="currentColor" />
        </svg>
        {looking ? "Looking up…" : "Scan to Add"}
      </button>

      {error && (
        <span style={{ fontSize: 11, color: colors.red || "#f87171", marginLeft: 8 }}>
          {error}
        </span>
      )}

      {cameraOpen && (
        <CameraScannerModal
          title="Scan Product Barcode"
          hint="Point your camera at a barcode."
          onDetected={handleDetected}
          onClose={() => setCameraOpen(false)}
        />
      )}
    </>
  );
}