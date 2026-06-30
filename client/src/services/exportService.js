// client/src/services/exportService.js
//
// Shared logic for every "Export" button across Products, Billing, Activity,
// and Dashboard. Centralized here because file-download requests need
// different handling than normal JSON API calls:
//   1. responseType must be "blob" (we're receiving a file, not JSON).
//   2. The real filename comes from the server's Content-Disposition header,
//      not something we make up client-side — using the server's name keeps
//      it in sync with however the backend dates/labels the file.
//   3. If the server errors (400/403/500), axios still delivers that JSON
//      error body as a Blob (because responseType was "blob" for the
//      request) — NOT as parsed JSON. Naively reading `error.response.data`
//      would show "[object Blob]" in a toast instead of the real message.
//      unwrapBlobError() below fixes that.

import API from "../api/axios";

/**
 * Extracts the filename from a Content-Disposition header like:
 *   'attachment; filename="products-export-2026-06-21.xlsx"'
 * Falls back to a generic name if the header is missing for any reason.
 */
function extractFilename(contentDisposition, fallback) {
  if (!contentDisposition) return fallback;
  const match = contentDisposition.match(/filename="?([^"]+)"?/);
  return match ? match[1] : fallback;
}

/**
 * Triggers a browser download for a Blob without any extra dependency
 * (file-saver is unnecessary for this — a temporary <a> + object URL is the
 * same handful of lines with one less package to maintain).
 */
function triggerBrowserDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoke on a short delay rather than immediately — some browsers (older
  // Safari in particular) can cancel the download if the URL is revoked
  // synchronously right after click().
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

/**
 * If `error` came from a blob-responseType request and the server actually
 * sent JSON (our validation/RBAC error responses do), this reads the blob
 * back out as text and parses it so the real message can be shown — instead
 * of "[object Blob]" or a generic fallback.
 */
async function unwrapBlobError(error, fallbackMessage) {
  const data = error?.response?.data;

  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const parsed = JSON.parse(text);
      return parsed.message || parsed.errors?.[0]?.message || fallbackMessage;
    } catch {
      // Response wasn't JSON (e.g. a network-level failure) — fall through.
    }
  }

  return error?.response?.data?.message || error?.message || fallbackMessage;
}

/**
 * Core export runner used by every export button. Handles the request,
 * the blob, the filename, the download trigger, and error unwrapping.
 *
 * @param {string} url - relative API path, e.g. "/export/products/excel"
 * @param {object} [params] - query params (search, category, from, to, ids, etc.)
 * @param {string} fallbackFilename - used only if the server didn't send Content-Disposition
 * @returns {Promise<{ filename: string }>}
 * @throws {Error} with a human-readable message (already unwrapped from any blob JSON error)
 */
export async function runExport(url, params = {}, fallbackFilename = "export.xlsx") {
  // Strip out undefined/empty params so the query string stays clean —
  // e.g. an unset "category" filter shouldn't be sent as "category=undefined".
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );

  try {
    const response = await API.get(url, {
      params: cleanParams,
      responseType: "blob",
    });

    const filename = extractFilename(response.headers["content-disposition"], fallbackFilename);
    triggerBrowserDownload(response.data, filename);

    // The backend sets this header when an activity export's date range had
    // to be clamped to the 7-day retention window — surface it so the
    // caller can show an informational toast alongside the success one.
    const notice = response.headers["x-export-notice"] || null;

    return { filename, notice };
  } catch (error) {
    const message = await unwrapBlobError(error, "Export failed. Please try again.");
    throw new Error(message);
  }
}

// ── Per-module convenience wrappers ─────────────────────────────────────────
// Thin and intentionally simple — all real logic lives in runExport above.

export const exportProducts = (format, filters = {}) =>
  runExport(`/api/export/products/${format}`, filters, `products-export.${format}`);

export const exportBills = (format, filters = {}) =>
  runExport(`/api/export/bills/${format}`, filters, `bills-export.${format}`);

export const exportActivity = (filters = {}) =>
  runExport("/api/export/activity/csv", filters, "activity-log-export.csv");

export const exportDashboardReport = () =>
  runExport("/api/export/dashboard/pdf", {}, "dashboard-report.pdf");
