// server/src/controllers/export.controller.js
//
// Thin HTTP layer for every export endpoint: validates query params, builds
// the filter object the service layer expects, sets response headers, and
// delegates the actual file-building work to services/export/*.
//
// RBAC summary (enforced in export.routes.js, restated here for clarity):
//   - Products export : admin + staff (same as viewing the Products page)
//   - Bills export     : admin + staff (matches /api/bills access)
//   - Activity export  : admin only    (matches /api/activities access)
//   - Dashboard PDF     : admin only    (company-wide financial summary)
//
// Every handler reads companyCode from req.user (set by authUser) — never
// from the request body/query — so a user can never export another
// company's data no matter what they pass in.

const {
  buildFilename,
  setDownloadHeaders,
  CONTENT_TYPES,
  parseDateRange,
  parseIdList,
  clampToActivityRetention,
  ACTIVITY_RETENTION_DAYS,
} = require("../services/export/exportHelpers");

const excelExport = require("../services/export/excelExport.service");
const csvExport = require("../services/export/csvExport.service");
const pdfExport = require("../services/export/pdfExport.service");

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/export/products/excel
const exportProductsExcel = async (req, res) => {
  try {
    const companyCode = req.user.companyCode;
    const { search, category, tab, productIds: rawIds } = req.query;
    const productIds = parseIdList(rawIds);

    if (rawIds && productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "productIds was provided but contained no valid product IDs",
      });
    }

    const filename = buildFilename("products", "xlsx");
    setDownloadHeaders(res, filename, CONTENT_TYPES.xlsx);

    await excelExport.streamProductsExcel(res, companyCode, {
      search,
      category,
      tab,
      productIds,
    });

    res.end();
  } catch (err) {
    console.error("[exportProductsExcel]", err);
    // Headers may already be sent if the stream started — guard before
    // attempting a JSON error response.
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Failed to export products" });
    } else {
      res.end();
    }
  }
};

// GET /api/export/products/csv
const exportProductsCsv = async (req, res) => {
  try {
    const companyCode = req.user.companyCode;
    const { search, category, tab, productIds: rawIds } = req.query;
    const productIds = parseIdList(rawIds);

    if (rawIds && productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "productIds was provided but contained no valid product IDs",
      });
    }

    const filename = buildFilename("products", "csv");
    setDownloadHeaders(res, filename, CONTENT_TYPES.csv);

    await csvExport.streamProductsCsv(res, companyCode, {
      search,
      category,
      tab,
      productIds,
    });

    res.end();
  } catch (err) {
    console.error("[exportProductsCsv]", err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Failed to export products" });
    } else {
      res.end();
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// BILLS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/export/bills/excel
const exportBillsExcel = async (req, res) => {
  try {
    const companyCode = req.user.companyCode;
    const { method, billIds: rawIds, from: fromStr, to: toStr } = req.query;

    const billIds = parseIdList(rawIds);
    if (rawIds && billIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "billIds was provided but contained no valid bill IDs",
      });
    }

    const { from, to, error } = parseDateRange(fromStr, toStr);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const filename = buildFilename("bills", "xlsx");
    setDownloadHeaders(res, filename, CONTENT_TYPES.xlsx);

    await excelExport.streamBillsExcel(res, companyCode, { from, to, method, billIds });

    res.end();
  } catch (err) {
    console.error("[exportBillsExcel]", err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Failed to export bills" });
    } else {
      res.end();
    }
  }
};

// GET /api/export/bills/csv
// Doubles as both "export bills/invoices" and "export sales history" (the
// row shape is the same — a sales-history CSV is just a bill list without
// per-item line breakdown), and also serves "billing reports by date range"
// when from/to are provided.
const exportBillsCsv = async (req, res) => {
  try {
    const companyCode = req.user.companyCode;
    const { method, billIds: rawIds, from: fromStr, to: toStr } = req.query;

    const billIds = parseIdList(rawIds);
    if (rawIds && billIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "billIds was provided but contained no valid bill IDs",
      });
    }

    const { from, to, error } = parseDateRange(fromStr, toStr);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const filename = buildFilename("bills", "csv");
    setDownloadHeaders(res, filename, CONTENT_TYPES.csv);

    await csvExport.streamBillsCsv(res, companyCode, { from, to, method, billIds });

    res.end();
  } catch (err) {
    console.error("[exportBillsCsv]", err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Failed to export bills" });
    } else {
      res.end();
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVITY  (admin only — enforced in export.routes.js)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/export/activity/csv
const exportActivityCsv = async (req, res) => {
  try {
    const companyCode = req.user.companyCode;
    const { from: fromStr, to: toStr, userId } = req.query;

    const { from, to, error } = parseDateRange(fromStr, toStr);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    // Activity has a 7-day TTL (see activity.model.js) — if the request
    // asked for a wider range, clamp it and tell the caller, rather than
    // silently returning fewer rows than requested with no explanation.
    const { clampedFrom, wasClamped } = clampToActivityRetention(from);

    if (wasClamped) {
      res.setHeader("X-Export-Notice", `Activity logs are retained for ${ACTIVITY_RETENTION_DAYS} days only — the "from" date was adjusted to the earliest available record.`);
    }

    const filename = buildFilename("activity-log", "csv");
    setDownloadHeaders(res, filename, CONTENT_TYPES.csv);

    await csvExport.streamActivityCsv(res, companyCode, { from: clampedFrom, to, userId });

    res.end();
  } catch (err) {
    console.error("[exportActivityCsv]", err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Failed to export activity log" });
    } else {
      res.end();
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD PDF REPORT  (admin only — enforced in export.routes.js)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/export/dashboard/pdf
const exportDashboardPdf = async (req, res) => {
  try {
    const companyCode = req.user.companyCode;
    const companyName = req.user.companyName;

    const filename = buildFilename("dashboard-report", "pdf");
    setDownloadHeaders(res, filename, CONTENT_TYPES.pdf);

    await pdfExport.streamDashboardReportPdf(res, companyCode, { companyName });

    // NOTE: no res.end() here — pdfkit's doc.end() (called inside the
    // service) is what actually finalizes and flushes the piped stream.
    // Calling res.end() ourselves on top of that can truncate the last
    // written chunk on slower connections.
  } catch (err) {
    console.error("[exportDashboardPdf]", err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: "Failed to generate dashboard report" });
    } else {
      res.end();
    }
  }
};

module.exports = {
  exportProductsExcel,
  exportProductsCsv,
  exportBillsExcel,
  exportBillsCsv,
  exportActivityCsv,
  exportDashboardPdf,
};