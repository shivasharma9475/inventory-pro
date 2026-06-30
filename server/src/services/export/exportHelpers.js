// server/src/services/export/exportHelpers.js
//
// Small shared utilities used by every export service (Excel/CSV/PDF) and
// the export controller. Keeping these in one place means every export
// endpoint sets headers, filenames, and validates input the same way.

const mongoose = require("mongoose");

/**
 * Builds a safe, descriptive filename for a download.
 * e.g. buildFilename("products", "xlsx") -> "products-export-2026-06-21.xlsx"
 */
function buildFilename(baseName, extension) {
  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const safeBase = String(baseName).replace(/[^a-zA-Z0-9_-]/g, "-");
  return `${safeBase}-export-${dateStr}.${extension}`;
}

/**
 * Sets the standard headers for a file download response.
 * Centralized so every export endpoint returns consistent, correct headers
 * (content type, content disposition, and explicit no-cache — exported
 * data should never be served from a browser/proxy cache).
 */
function setDownloadHeaders(res, filename, contentType) {
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

const CONTENT_TYPES = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv; charset=utf-8",
  pdf: "application/pdf",
};

/**
 * Parses and validates an optional `from`/`to` date-range query pair.
 * Returns { from: Date|null, to: Date|null, error: string|null }.
 * `to` is normalized to end-of-day so a single-day range (from === to)
 * actually includes that whole day, matching the convention already used
 * in bill.controller.js.
 */
function parseDateRange(fromStr, toStr) {
  let from = null;
  let to = null;

  if (fromStr) {
    from = new Date(fromStr);
    if (Number.isNaN(from.getTime())) {
      return { from: null, to: null, error: `Invalid "from" date: ${fromStr}` };
    }
  }

  if (toStr) {
    to = new Date(toStr);
    if (Number.isNaN(to.getTime())) {
      return { from: null, to: null, error: `Invalid "to" date: ${toStr}` };
    }
    to.setHours(23, 59, 59, 999);
  }

  if (from && to && from > to) {
    return { from: null, to: null, error: '"from" date must be before "to" date' };
  }

  return { from, to, error: null };
}

/**
 * Parses a comma-separated or JSON-array string of Mongo ObjectIds (used for
 * "export only selected products/bills"). Filters out anything that isn't a
 * valid ObjectId rather than throwing, since a single malformed id shouldn't
 * fail the whole export — but if the *entire* list turns out invalid after
 * filtering, the caller should treat that as a validation error.
 */
function parseIdList(raw) {
  if (!raw) return [];

  let values = [];
  if (Array.isArray(raw)) {
    values = raw;
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("[")) {
      try {
        values = JSON.parse(trimmed);
      } catch {
        values = trimmed.split(",");
      }
    } else {
      values = trimmed.split(",");
    }
  }

  return values
    .map((v) => String(v).trim())
    .filter((v) => v && mongoose.Types.ObjectId.isValid(v));
}

// Activity logs have a 7-day TTL (see activity.model.js) — anything older
// genuinely doesn't exist anymore, so we cap and warn rather than silently
// returning an empty file with no explanation.
const ACTIVITY_RETENTION_DAYS = 7;

function clampToActivityRetention(from) {
  const earliestPossible = new Date(Date.now() - ACTIVITY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  if (!from || from < earliestPossible) {
    return { clampedFrom: earliestPossible, wasClamped: Boolean(from) && from < earliestPossible };
  }
  return { clampedFrom: from, wasClamped: false };
}

module.exports = {
  buildFilename,
  setDownloadHeaders,
  CONTENT_TYPES,
  parseDateRange,
  parseIdList,
  ACTIVITY_RETENTION_DAYS,
  clampToActivityRetention,
};