// hooks/usePayment.js  — UPDATED
// Reads enabled payment methods + publishable keys from company settings API.
// Backend keys (secret) stay on server — only public keys come to frontend.

import { useState, useRef, useEffect } from "react"; 
import API from "../../api/axios";
import {
  createRazorpayOrder,
  verifyRazorpayPayment,
  initiateBankTransfer as initiateBankTransferService
} from "../../services/paymentService";

// ── Load Razorpay script once ─────────────────────────────────────────────────
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s   = document.createElement("script");
    s.src     = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload  = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// ── Stripe singleton per publishable key ──────────────────────────────────────
const _stripeCache = {};
async function getStripeInstance(publishableKey) {
  if (!publishableKey) throw new Error("Stripe publishable key not configured");
  if (_stripeCache[publishableKey]) return _stripeCache[publishableKey];
  const { loadStripe } = await import("@stripe/stripe-js");
  _stripeCache[publishableKey] = await loadStripe(publishableKey);
  return _stripeCache[publishableKey];
}



// ─────────────────────────────────────────────────────────────────────────────
export function usePayment({ buyer, items, taxRate = 0, onSuccess }) {
  const [payMethod,    setPayMethod]    = useState(null);
  const [status,       setStatus]       = useState("idle"); // idle|loading|success|error|bank_pending
  const [errorMsg,     setErrorMsg]     = useState("");
  const [bankInfo,     setBankInfo]     = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Stripe refs
  const stripeRef      = useRef(null);
  const elementsRef    = useRef(null);
  const cardElRef      = useRef(null);
  const cardDomRef     = useRef(null);
  const [cardReady,    setCardReady]    = useState(false);
  const [cardComplete, setCardComplete] = useState(false);

  // ── Load company settings on mount ────────────────────────────────────────
  useEffect(() => {
    API.get("/api/company-settings")
      .then((r) => setCompanySettings(r.data?.data || null))
      .catch(() => setCompanySettings(null))
      .finally(() => setSettingsLoading(false));
  }, []);

  // ── Mount Stripe card element when card method is selected ─────────────────
  useEffect(() => {
    if (payMethod !== "card") return;
    const publishableKey = companySettings?.stripe?.publishableKey;
    if (!publishableKey) return;

    let mounted = true;
    (async () => {
      try {
        const stripe = await getStripeInstance(publishableKey);
        if (!mounted) return;
        stripeRef.current   = stripe;
        elementsRef.current = stripe.elements();

        // Wait for DOM ref
        setTimeout(() => {
          if (!cardDomRef.current || cardElRef.current) return;
          const el = elementsRef.current.create("card", {
            style: {
              base: {
                color: "#fff", fontSize: "14px", fontFamily: "monospace",
                "::placeholder": { color: "rgba(255,255,255,0.25)" },
                iconColor: "#60a5fa",
              },
              invalid: { color: "#f87171" },
            },
          });
          el.mount(cardDomRef.current);
          el.on("change", (e) => setCardComplete(e.complete));
          cardElRef.current = el;
          setCardReady(true);
        }, 80);
      } catch (err) {
        console.error("Stripe init failed:", err);
      }
    })();
    return () => { mounted = false; };
  }, [payMethod, companySettings]);

  // ── Select method — resets state ──────────────────────────────────────────
  const selectMethod = (m) => {
    setPayMethod(m);
    setStatus("idle");
    setErrorMsg("");
    setBankInfo(null);
    setCardComplete(false);
    if (cardElRef.current) {
      cardElRef.current.unmount();
      cardElRef.current = null;
      setCardReady(false);
    }
  };

  const setErr = (msg) => { setStatus("error"); setErrorMsg(msg); };

  // ── 1. Razorpay (UPI / Wallets) ───────────────────────────────────────────
  const payWithRazorpay = async () => {
    setStatus("loading"); setErrorMsg("");
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Razorpay SDK failed to load. Check your connection.");

      const { data: order } = await createRazorpayOrder({
  items,
  buyer,
  taxRate,
});

      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
  key: order.keyId,
  amount: order.amount,
  currency: order.currency,
  order_id: order.orderId,

  // 🔥 ADD THIS BLOCK
  method: {
    upi: true,
    card: true,
    netbanking: true,
    wallet: true,
  },

  name: companySettings?.name || "Your Store",
  description: "Bill Payment",
  image: companySettings?.logoUrl || undefined,

  prefill: {
    name: buyer.name,
    contact: buyer.phone,
    email: buyer.email || "",
  },

  theme: { color: "#6366f1" },
          handler: async (response) => {
            try {
              const { data } = await verifyRazorpayPayment({
  razorpay_order_id: response.razorpay_order_id,
  razorpay_payment_id: response.razorpay_payment_id,
  razorpay_signature: response.razorpay_signature,
  items,
  buyer,
  taxRate,
});
              setStatus("success");
              onSuccess(data.bill);
              resolve();
            } catch (err) {
              reject(new Error(err.response?.data?.message || "Verification failed"));
            }
          },
          modal: { ondismiss: () => reject(new Error("DISMISSED")) },
        });
        rzp.on("payment.failed", (r) =>
          reject(new Error(r.error?.description || "Payment failed"))
        );
        rzp.open();
      });
    } catch (err) {
      if (err.message === "DISMISSED") { setStatus("idle"); return; }
      setErr(err.message || "Razorpay payment failed");
    }
  };

  // ── 2. Stripe (Card) ──────────────────────────────────────────────────────
  const payWithStripe = async () => {
    if (!stripeRef.current || !cardElRef.current) return setErr("Card element not ready");
    setStatus("loading"); setErrorMsg("");
    try {
      // Backend creates PaymentIntent using its stored Stripe secret key
      const { data: intent } = await API.post("/api/payments/stripe/create-intent", {
        items, buyer, taxRate,
      });

      // Confirm on client with card element
      const { error, paymentIntent } = await stripeRef.current.confirmCardPayment(
        intent.clientSecret,
        {
          payment_method: {
            card: cardElRef.current,
            billing_details: {
              name:  buyer.name,
              email: buyer.email,
              phone: buyer.phone,
            },
          },
        }
      );

      if (error) throw new Error(error.message);
      if (paymentIntent.status !== "succeeded") throw new Error("Payment incomplete");

      // Backend re-verifies and creates bill
      const { data } = await API.post("/api/payments/stripe/confirm-and-bill", {
        paymentIntentId: paymentIntent.id,
        items, buyer, taxRate,
      });

      setStatus("success");
      onSuccess(data.bill);
    } catch (err) {
      setErr(err.message || "Card payment failed");
    }
  };

  // ── 3. Bank Transfer ──────────────────────────────────────────────────────
  const initiateBankTransfer = async () => {
    setStatus("loading"); setErrorMsg("");
    try {
      const { data } = await initiateBankTransferService({
  items,
  buyer,
  taxRate,
});
      setBankInfo(data);
      setStatus("bank_pending");
    } catch (err) {
      setErr(err.response?.data?.message || "Failed to initiate bank transfer");
    }
  };

  // ── 4. Cash ───────────────────────────────────────────────────────────────
  const payWithCash = async () => {
    setStatus("loading"); setErrorMsg("");
    try {
      const { data } = await API.post("/api/bills", {
        items, buyer, taxRate,
        payment: { method: "cash", status: "paid" },
      });
      setStatus("success");
      onSuccess(data);
    } catch (err) {
      setErr(err.response?.data?.message || "Failed to create cash bill");
    }
  };

  // ── Dispatcher ────────────────────────────────────────────────────────────
  const pay = () => {
    if (payMethod === "upi")           return payWithRazorpay();
    if (payMethod === "card")          return payWithStripe();
    if (payMethod === "bank_transfer") return initiateBankTransfer();
    if (payMethod === "cash")          return payWithCash();
  };

  // ── Which methods are enabled (driven by company settings) ────────────────
  const enabledMethods = companySettings?.enabledPaymentMethods || {
    cash: true, upi: false, card: false, bankTransfer: false,
  };

  const canPay =
    (payMethod === "cash")          ||
    (payMethod === "upi")           ||
    (payMethod === "card"           && cardComplete) ||
    (payMethod === "bank_transfer");

  return {
    // State
    payMethod, selectMethod,
    status, errorMsg,
    bankInfo,
    companySettings,
    enabledMethods,
    settingsLoading,

    // Stripe card
    cardDomRef, cardReady, cardComplete,

    // Actions
    pay, canPay,

    // Shorthand booleans
    isLoading:     status === "loading",
    isSuccess:     status === "success",
    isBankPending: status === "bank_pending",
    isError:       status === "error",
  };
}