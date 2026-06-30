// client/src/components/common/ExportButton.jsx
//
// Reusable "Export" button + dropdown, used on Products, Billing, Activity,
// and Dashboard pages. Each page configures which formats are offered and
// supplies the actual export function (from services/exportService.js) plus
// whatever filters/params should be sent with the current view.
//
// Deliberately dumb/generic: this component only handles UI state (open/
// closed dropdown, loading spinner, disabling itself while a download is in
// flight) and toast feedback. All the actual "what to export" logic lives in
// the page using it, passed in via the `onExport` prop.

import { useEffect, useRef, useState } from "react";
import { btnPrimary, btnGhost, colors, card } from "../dashboard/styles/tokens";
import { useToast } from "./ToastProvider";

/**
 * @param {{ key: string, label: string }[]} formats - e.g. [{ key: "excel", label: "Excel (.xlsx)" }, { key: "csv", label: "CSV" }]
 * @param {(formatKey: string) => Promise<{ filename: string, notice?: string }>} onExport
 *        Called with the chosen format's key. Must return the result of the
 *        relevant services/exportService.js function (or throw an Error
 *        with a human-readable message on failure).
 * @param {string} [label] - button label, defaults to "Export"
 * @param {boolean} [disabled] - e.g. disable while the page's own data is still loading
 */
export default function ExportButton({
  formats,
  onExport,
  label = "Export",
  disabled = false,
  style = {},
  onClick,
}) {
  const [open, setOpen] = useState(false);
  const [loadingFormat, setLoadingFormat] = useState(null); // which format key is in flight, or null
  const containerRef = useRef(null);
  const { showToast } = useToast();

  // Close the dropdown on an outside click — standard dropdown UX, and
  // without it the menu would stay open if the user clicks elsewhere on
  // the page.
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = async (formatKey, formatLabel) => {
    setOpen(false);
    setLoadingFormat(formatKey);
    try {
      const result = await onExport(formatKey);
      showToast(`Downloaded ${result?.filename || formatLabel}`, "success");
      if (result?.notice) {
        showToast(result.notice, "info", 7000);
      }
    } catch (error) {
      showToast(error.message || `Failed to export as ${formatLabel}`, "error");
    } finally {
      setLoadingFormat(null);
    }
  };

  const isBusy = loadingFormat !== null;

  // Single format (e.g. Dashboard's PDF-only report) skips the dropdown
  // entirely — clicking the button exports immediately.
  if (formats.length === 1) {
    const only = formats[0];
    return (
      <button
        onClick={() => handleSelect(only.key, only.label)}
        disabled={disabled || isBusy}
        style={{
          ...btnPrimary,
          opacity: disabled || isBusy ? 0.6 : 1,
          cursor: disabled || isBusy ? "not-allowed" : "pointer",
        }}
      >
        {isBusy ? <span className="loader" /> : null}
        {isBusy ? "Generating..." : label}
      </button>
    );
  }

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled || isBusy}
        style={{
          ...btnPrimary,
          opacity: disabled || isBusy ? 0.6 : 1,
          cursor: disabled || isBusy ? "not-allowed" : "pointer",
        }}
      >
        {isBusy ? <span className="loader" /> : null}
        {isBusy ? "Exporting..." : label}
        {!isBusy && <span style={{ fontSize: 10, marginLeft: 2 }}>▾</span>}
      </button>

      {open && (
        <div
          style={{
            ...card,
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 170,
            background: "#0d0e14",
            overflow: "hidden",
            zIndex: 100,
            boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
          }}
        >
          {formats.map((format) => (
            <button
              key={format.key}
              onClick={() => handleSelect(format.key, format.label)}
              style={{
                ...btnGhost,
                width: "100%",
                textAlign: "left",
                background: "transparent",
                border: "none",
                borderRadius: 0,
                padding: "10px 14px",
                fontSize: 12,
                color: "rgba(255,255,255,0.8)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {format.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
