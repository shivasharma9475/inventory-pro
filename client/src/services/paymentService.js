import API from "../api/axios";


// 🔥 Create Razorpay Order
export const createRazorpayOrder = async (payload) => {
  return API.post("/api/payments/razorpay/create-order", payload);
};

// 🔥 Verify payment & create bill
export const verifyRazorpayPayment = async (payload) => {
  return API.post("/api/payments/razorpay/verify-and-bill", payload);
};



// 🔥 Create Payment Intent
export const createStripeIntent = async (payload) => {
  return API.post("/api/payments/stripe/create-intent", payload);
};

// 🔥 Confirm payment & create bill
export const confirmStripePayment = async (payload) => {
  return API.post("/api/payments/stripe/confirm-and-bill", payload);
};



// 🔥 Initiate bank transfer
export const initiateBankTransfer = async (payload) => {
  return API.post("/api/payments/bank/initiate", payload);
};

// 🔥 Admin verifies bank transfer
export const verifyBankTransfer = async (billId) => {
  return API.patch(`/api/payments/bank/verify/${billId}`);
};

