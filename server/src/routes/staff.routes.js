const express = require('express');
const router = express.Router();

const { authUser, authorise } = require("../middleware/auth.middleware");
const { createStaff, getStaff, deleteStaff } = require("../controllers/Staff.controller");

const validationRules = require("../middleware/validation.middleware");

// 🧑‍💼 ADMIN → Create Staff (with validation)
router.post(
  "/create-staff",
  authUser,
  authorise("admin"),
  ...validationRules.createStaffValidationRules,
  createStaff
);

// 🧑‍💼 ADMIN → Get Staff
router.get(
  "/",
  authUser,
  authorise("admin"),
  getStaff
);

// 🧑‍💼 ADMIN → Delete Staff (with ID validation)
router.delete(
  "/:id",
  authUser,
  authorise("admin"),
  validationRules.validateObjectId, // ✅ FIX
  deleteStaff
);

module.exports = router;