const express = require("express");
const { query } = require("express-validator");

const router = express.Router();

const {
  activityController,
} = require("../controllers/activity.controller");

const { authUser, authorise } = require("../middleware/auth.middleware");
const { validateResult } = require("../middleware/validation.middleware");

// 🧑‍💼 ADMIN ONLY — every route below requires an authenticated admin.
// Activity logs can reveal staff actions, customer data, and stock movements
// across the whole company, so this must never be readable by staff accounts.
router.use(authUser, authorise("admin"));

router.get("/", activityController.getActivities);

router.get(
  "/history",
  [
    query("from").optional().isISO8601().withMessage("from must be a valid date (YYYY-MM-DD)"),
    query("to").optional().isISO8601().withMessage("to must be a valid date (YYYY-MM-DD)"),
    query("userId").optional().isMongoId().withMessage("userId must be a valid user id"),
  ],
  validateResult,
  activityController.getActivityHistory
);

module.exports = router;