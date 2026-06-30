const express = require("express");
const router  = express.Router();
const {
  createRazorpayOrder,
  verifyRazorpayAndBill,
  createStripeIntent,
  confirmStripeAndBill,
  initiateBankTransfer,
  verifyBankTransfer,
  stripeWebhook,
} = require("../controllers/payment.controller");
const { authUser, authorise } = require("../middleware/auth.middleware");


// ── Stripe webhook needs raw body — mount BEFORE express.json() in app.js ────
// In app.js: app.use("/api/payments/stripe/webhook", express.raw({ type: "application/json" }), paymentRoutes);
router.post("/stripe/webhook", stripeWebhook);

// ── All other routes require authentication ───────────────────────────────────
router.use(authUser);

// Razorpay (UPI / Wallets)
router.post("/razorpay/create-order",    createRazorpayOrder);
router.post("/razorpay/verify-and-bill", verifyRazorpayAndBill);

// Stripe (Card)
router.post("/stripe/create-intent",    createStripeIntent);
router.post("/stripe/confirm-and-bill", confirmStripeAndBill);

// Bank Transfer
router.post("/bank/initiate",          initiateBankTransfer);
router.patch(
  "/bank/verify/:billId",
  authorise("admin"),   
  verifyBankTransfer
);
module.exports = router;