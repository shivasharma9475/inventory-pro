// client/src/components/hooks/useBarcodeScanner.js
//
// Most USB/Bluetooth barcode scanners act as HID keyboards: they "type" the
// barcode digits very fast and then send an Enter keypress. This hook listens
// for that pattern globally (no input field needs to be focused) and calls
// `onScan(code)` when a barcode is detected.
//
// Heuristic: characters arriving faster than `maxKeyGapMs` apart are buffered
// as a single scan. A human typing won't trigger this (gap is usually >50ms
// per key), but a scanner emits all characters within a few ms.

import { useEffect, useRef } from "react";

const DEFAULT_MAX_KEY_GAP_MS = 50;
const MIN_BARCODE_LENGTH = 4;

/**
 * @param {(code: string) => void} onScan - called with the scanned code (Enter-terminated)
 * @param {Object} [options]
 * @param {boolean} [options.enabled=true] - disable listening (e.g. while a modal/input is focused for typing)
 * @param {number} [options.maxKeyGapMs]
 * @param {number} [options.minLength]
 */
export default function useBarcodeScanner(onScan, options = {}) {
  const {
    enabled = true,
    maxKeyGapMs = DEFAULT_MAX_KEY_GAP_MS,
    minLength = MIN_BARCODE_LENGTH,
  } = options;

  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      // Ignore modifier-only / non-character keys (except Enter)
      if (e.key === "Shift" || e.key === "Control" || e.key === "Alt" || e.key === "Meta") {
        return;
      }

      const now = Date.now();
      const gap = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === "Enter") {
        const code = bufferRef.current.trim();
        bufferRef.current = "";
        if (code.length >= minLength) {
          onScan(code);
        }
        return;
      }

      // If the gap since the last key is too large, this is likely human
      // typing (e.g. into a search box) — reset the buffer.
      if (gap > maxKeyGapMs) {
        bufferRef.current = "";
      }

      // Only buffer printable single characters (barcodes are alphanumeric)
      if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onScan, maxKeyGapMs, minLength]);
}