const express = require("express");
const rateLimit = require("express-rate-limit");

const authController = require("../controllers/auth.controller");
const companySettingsController = require("../controllers/companySettings.controller");

const { authUser } = require("../middleware/auth.middleware");

const validationRules = require("../middleware/validation.middleware");



const router = express.Router();

// ── RATE LIMITERS ─────────────────────────────────────────

const isDev = process.env.NODE_ENV !== "production";
const disableRateLimit = process.env.DISABLE_RATE_LIMIT === "true";

// Bypass middleware for development testing
const bypassMiddleware = (req, res, next) => next();

// Login — 5 attempts per 15 minutes (dev: 20 per 15 min)
const loginLimiter = disableRateLimit ? bypassMiddleware : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 20 : 5,
  message: { message: "Too many login attempts — please try again after 15 minutes" },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP routes — 3 requests per 5 minutes (dev: 15 per 5 min)
const otpLimiter = disableRateLimit ? bypassMiddleware : rateLimit({
  windowMs: 5 * 60 * 1000,
  max: isDev ? 15 : 3,
  message: { message: "Too many OTP requests — please wait before trying again" },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── REGISTRATION ──────────────────────────────────────────
router.post(
  "/register",
  validationRules.registerUserValidationRules,
  authController.registerUser
);

// ── OTP ───────────────────────────────────────────────────
router.post(
  "/verify-otp",
  otpLimiter,
  validationRules.verifyOTPValidationRules,
  authController.verifyOTP
);

router.post(
  "/resend-otp",
  otpLimiter,
  authController.resendOTP
);

// ── PASSWORD ──────────────────────────────────────────────
router.post(
  "/forgot-password",
  otpLimiter,
  validationRules.forgotPasswordValidationRules,
  authController.forgotPassword
);

router.post(
  "/reset-password",
  validationRules.resetPasswordValidationRules,
  authController.resetPassword
);

// ── SESSION ───────────────────────────────────────────────
router.post(
  "/login",
  loginLimiter,
  validationRules.loginValidationRules,
  authController.loginUser
);

router.post(
  "/logout",
  authUser,                   
  authController.logOutUser
);

router.get("/me", authUser, authController.getMe);

router.put("/me", authUser, authController.updateMe);

router.post("/change-password", authUser, authController.changePassword);

router.put(
  "/profile-photo",
  authUser,
  companySettingsController.uploadProfilePhoto
);

module.exports = router;