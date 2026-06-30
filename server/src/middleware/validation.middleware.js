const { body, validationResult } = require("express-validator");
const mongoose = require("mongoose");

// ── VALIDATION RESULT HANDLER ─────────────────────────────
const validateResult = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }

  next();
};

// ── REGISTER ──────────────────────────────────────────────
const registerUserValidationRules = [

  body("companyName")
    .trim()
    .notEmpty().withMessage("Company name is required")
    .isLength({ min: 2 }).withMessage("Company name must be at least 2 characters"),

  body("email")
    .isEmail().withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password")
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage(
      "Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character"
    ),

  body("country")
    .optional()
    .isString().withMessage("Country must be a valid string"),

  body("state")
    .trim()
    .notEmpty().withMessage("State is required"),

  body("city")
    .trim()
    .notEmpty().withMessage("City is required"),

  
  body("phone")
    .custom((value) => {
      const intlFormat = /^\+[1-9]\d{7,14}$/;       // +91XXXXXXXXXX
      const localFormat = /^[6-9]\d{9}$/;            // 10-digit Indian number
      if (!intlFormat.test(value) && !localFormat.test(value)) {
        throw new Error(
          "Please enter a valid phone number (e.g. 9876543210 or +919876543210)"
        );
      }
      return true;
    }),

  validateResult,
];

// ── LOGIN ─────────────────────────────────────────────────
const loginValidationRules = [

  body("email")
    .isEmail().withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required"),

  body("companyCode")
    .trim()
    .notEmpty().withMessage("Company is required")
    .isLength({ min: 2 }).withMessage("Invalid company name"),

  validateResult,
];

// ── VERIFY OTP ────────────────────────────────────────────
const verifyOTPValidationRules = [

  body("email")
    .isEmail().withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("otp")
    .trim()
    .notEmpty().withMessage("OTP is required")
    .isLength({ min: 6, max: 6 }).withMessage("OTP must be exactly 6 digits")
    .isNumeric().withMessage("OTP must contain only numbers"),

  validateResult,
];


const forgotPasswordValidationRules = [

  body("email")
    .isEmail().withMessage("Please provide a valid email address")
    .normalizeEmail(),

  validateResult,
];

const resetPasswordValidationRules = [

  body("email")
    .isEmail().withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("newPassword")
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage(
      "New password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character"
    ),

  validateResult,
];

const createStaffValidationRules = [
  body("name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be 2–50 characters"),

  body("email")
    .isEmail()
    .withMessage("Valid email required")
    .normalizeEmail(),

  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),

  body("designation")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Designation too long"),

  validateResult,
];

const AddProductValidationRules = [

  body("name")
    .trim()
    .notEmpty().withMessage("Product name is required")
    .isLength({ min: 2 }).withMessage("Product name must be at least 2 characters"),

  body("price")
    .notEmpty().withMessage("Price is required")
    .isFloat({ min: 0 }).withMessage("Price must be a positive number"),

  body("stock")
    .notEmpty().withMessage("Stock is required")
    .isInt({ min: 0 }).withMessage("Stock must be a non-negative whole number"),

  body("lowStockThreshold")
  .optional()
  .isInt({ min: 0 })
  .withMessage("Low stock threshold must be a non-negative number"),

  body("category")
    .optional()
    .isIn(["Food", "Electronics", "Clothing", "Other"])
    .withMessage("Category must be one of: Food, Electronics, Clothing, Other"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters"),

  validateResult,
];

const UpdateProductValidationRules = [

  body("name")
    .optional()
    .trim()
    .notEmpty().withMessage("Product name cannot be empty")
    .isLength({ min: 2 }).withMessage("Product name must be at least 2 characters"),

  body("price")
    .optional()
    .isFloat({ min: 0 }).withMessage("Price must be a positive number"),

  body("stock")
    .optional()
    .isInt({ min: 0 }).withMessage("Stock must be a non-negative whole number"),

  body("minStock")
    .optional()
    .isInt({ min: 0 }).withMessage("Minimum stock must be a non-negative whole number"),

  body("category")
    .optional()
    .isIn(["Food", "Electronics", "Clothing", "Other"])
    .withMessage("Category must be one of: Food, Electronics, Clothing, Other"),

  body("description")
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage("Description cannot exceed 500 characters"),

  validateResult,
];

const validateObjectId = (req, res, next) => {
  const { id } = req.params;

  // ✅ Check valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid ID format",
    });
  }

  next(); // ✅ continue if valid
};

module.exports = {
  validateResult,
  registerUserValidationRules,
  loginValidationRules,
  verifyOTPValidationRules,
  forgotPasswordValidationRules,
  resetPasswordValidationRules,
  AddProductValidationRules,
  UpdateProductValidationRules,
  validateObjectId,
  createStaffValidationRules,
};