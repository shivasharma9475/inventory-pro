const express = require("express");
const router  = express.Router();
const {
  createBill,
  getBills,
  getBillById,
  getSalesSummary,
} = require("../controllers/bill.controller");

const { authUser } = require("../middleware/auth.middleware"); // your existing auth middleware

// ── All routes require authentication ────────────────────────────────────────
router.use(authUser);

// ── Analytics (must be before /:id to avoid route conflict) ──────────────────
router.get("/analytics/summary", getSalesSummary);

// ── CRUD ──────────────────────────────────────────────────────────────────────
router.route("/")
  .get(getBills)     // GET  /api/bills  → paginated list
  .post(createBill); // POST /api/bills  → create bill

router.get("/:id", getBillById); // GET /api/bills/:id → single bill

module.exports = router;