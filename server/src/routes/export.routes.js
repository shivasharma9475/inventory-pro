// server/src/routes/export.routes.js
//
// Mounted at /api/export in app.js. Every route requires authentication;
// RBAC matches the underlying data's existing access rules:
//   - products/bills : admin + staff
//   - activity/dashboard : admin only
//
// req.user.companyCode (set by authUser) is the ONLY source of company
// scope used anywhere in this feature — query params are never trusted for
// that purpose. See export.controller.js for the actual enforcement.

const express = require("express");
const { query } = require("express-validator");

const router = express.Router();

const { authUser, authorise } = require("../middleware/auth.middleware");
const { validateResult } = require("../middleware/validation.middleware");
const exportController = require("../controllers/export.controller");

// Shared validators ───────────────────────────────────────────────────────
const dateRangeValidators = [
  query("from").optional().isISO8601().withMessage("from must be a valid date (YYYY-MM-DD)"),
  query("to").optional().isISO8601().withMessage("to must be a valid date (YYYY-MM-DD)"),
];

// Every export route needs a logged-in user — applied once for the whole router.
router.use(authUser);

// ── Products ────────────────────────────────────────────────────────────────
// admin + staff: matches who can already view/use the Products page.
router.get(
  "/products/excel",
  authorise("admin", "staff"),
  [
    query("search").optional().isString().trim(),
    query("category").optional().isString().trim(),
    query("tab").optional().isIn(["active", "deleted"]),
    query("productIds").optional().isString(),
  ],
  validateResult,
  exportController.exportProductsExcel
);

router.get(
  "/products/csv",
  authorise("admin", "staff"),
  [
    query("search").optional().isString().trim(),
    query("category").optional().isString().trim(),
    query("tab").optional().isIn(["active", "deleted"]),
    query("productIds").optional().isString(),
  ],
  validateResult,
  exportController.exportProductsCsv
);

// ── Bills ───────────────────────────────────────────────────────────────────
// admin + staff: matches who can already view /api/bills.
router.get(
  "/bills/excel",
  authorise("admin", "staff"),
  [
    ...dateRangeValidators,
    query("method").optional().isString().trim(),
    query("billIds").optional().isString(),
  ],
  validateResult,
  exportController.exportBillsExcel
);

router.get(
  "/bills/csv",
  authorise("admin", "staff"),
  [
    ...dateRangeValidators,
    query("method").optional().isString().trim(),
    query("billIds").optional().isString(),
  ],
  validateResult,
  exportController.exportBillsCsv
);

// ── Activity ────────────────────────────────────────────────────────────────
// admin only: matches /api/activities' own RBAC (see activity.routes.js).
router.get(
  "/activity/csv",
  authorise("admin"),
  [
    ...dateRangeValidators,
    query("userId").optional().isMongoId().withMessage("userId must be a valid user id"),
  ],
  validateResult,
  exportController.exportActivityCsv
);

// ── Dashboard report ─────────────────────────────────────────────────────────
// admin only: aggregates company-wide financials.
router.get(
  "/dashboard/pdf",
  authorise("admin"),
  exportController.exportDashboardPdf
);

module.exports = router;