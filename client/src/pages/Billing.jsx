// pages/Billing.jsx  — FINAL (reads enabled payment methods from company settings)
import { useState, useEffect, useRef } from "react";
import { getProducts }                 from "../services/productService";
import { getMe }                       from "../services/authService";
import { PageHeader, LoadingState, EmptyState } from "../components/dashboard/ui/index";
import { card, btnPrimary, colors, inputBase }  from "../components/dashboard/styles/tokens";
import { usePayment }                           from "../components/hooks/usePayment";
import {
  PaymentMethodSelector,
  UPIPanel, CardPanel, CashPanel, BankHintPanel, BankPanel,
  PaymentStatusBar,
} from "../components/billing/PaymentPanel";
import { ReceiptDocument } from "../components/billing/ReceiptDocument";
import BarcodeScannerPanel from "../components/billing/BarcodeScannerPanel";
import socket from "../socket";
import BillHistory from "../components/billing/billingHistory";

// ─── Tiny shared primitives ───────────────────────────────────────────────────
const TH = ({ children, right }) => (
  <th style={{
    padding: "10px 14px", textAlign: right ? "right" : "left", fontSize: 10,
    color: "rgba(255,255,255,0.28)", letterSpacing: "0.1em",
    textTransform: "uppercase", fontWeight: 400,
  }}>{children}</th>
);

const FieldLabel = ({ children }) => (
  <span style={{
    fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em",
    textTransform: "uppercase", display: "block", marginBottom: 5,
  }}>{children}</span>
);

const Field = ({ label, ...props }) => (
  <div style={{ marginBottom: 11 }}>
    <FieldLabel>{label}</FieldLabel>
    <input {...props} style={{ ...inputBase, width: "100%", ...props.style }} />
  </div>
);

const STEPS = ["Cart", "Buyer", "Payment"];

const StepDot = ({ idx, currentIdx }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
    <div style={{
      width: 26, height: 26, borderRadius: "50%", display: "flex",
      alignItems: "center", justifyContent: "center",
      fontSize: 11, fontWeight: 600, transition: "all 0.2s",
      background: idx < currentIdx ? colors.green
                : idx === currentIdx ? colors.purple
                : "rgba(255,255,255,0.06)",
      color: idx <= currentIdx ? "#fff" : "rgba(255,255,255,0.2)",
      border: `1.5px solid ${idx === currentIdx ? colors.purple : "transparent"}`,
    }}>
      {idx < currentIdx ? "✓" : idx + 1}
    </div>
    <span style={{
      fontSize: 9, letterSpacing: "0.06em", textTransform: "uppercase",
      color: idx === currentIdx ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.2)",
    }}>{STEPS[idx]}</span>
  </div>
);

const BackBtn = ({ onClick }) => (
  <button onClick={onClick} style={{
    flex: 1, padding: "10px", borderRadius: 8, fontSize: 12, cursor: "pointer",
    background: "rgba(255,255,255,0.04)", border: `0.5px solid ${colors.border}`,
    color: "rgba(255,255,255,0.4)", outline: "none",
  }}>← Back</button>
);

// ─────────────────────────────────────────────────────────────────────────────
export default function Billing() {
  const [products, setProducts] = useState([]);
  const [company,  setCompany]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [cart,     setCart]     = useState([]);
  const [step,     setStep]     = useState(0);
  const [buyer, setBuyer] = useState({
    name: "", phone: "", email: "", gst: "",
    address: "", city: "", state: "", pincode: "",
  });
  const [lastBill, setLastBill] = useState(null);
  const [scanFeedback, setScanFeedback] = useState(null); // { type: 'success'|'error', message }
  const receiptRef = useRef(null);
  const [showHistory, setShowHistory] = useState(false);

  // ── Payment hook ──────────────────────────────────────────────────────────
  const payment = usePayment({
    buyer,
    items: cart.map((i) => ({ productId: i.product._id, quantity: i.quantity })),
    taxRate: 0,
    onSuccess: (bill) => {
      setLastBill(bill);
      setCart([]);
      setStep(0);
      setBuyer({ name: "", phone: "", email: "", gst: "", address: "", city: "", state: "", pincode: "" });
      loadProducts();
    },
  });

  useEffect(() => {
    getMe().then((r) => setCompany(r.data?.user)).catch(console.error);
    loadProducts();
  }, []);
  
  const displayCompany = {
  name: payment.companySettings?.companyName || company?.companyName,
  tagline: payment.companySettings?.tagline || "",
  address: payment.companySettings?.address || "",
  city: payment.companySettings?.city || "",
  state: payment.companySettings?.state || "",
  pincode: payment.companySettings?.pincode || "",
  phone: payment.companySettings?.phone || "",
  email: payment.companySettings?.email || "",
  gst: payment.companySettings?.gst || "",
  logoUrl: payment.companySettings?.companyLogo?.url || "",
};

  const loadProducts = () => {
    setLoading(true);
    getProducts()
      .then((r) => setProducts(r.data?.data || r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // Same fetch, but without toggling the full-page loading skeleton — used
  // for real-time background refreshes so a cashier mid-checkout doesn't see
  // the screen flash to a loading state because someone restocked an item
  // on another screen.
  const refreshProductsQuietly = () => {
    getProducts()
      .then((r) => setProducts(r.data?.data || r.data || []))
      .catch(console.error);
  };

  // ── Real-time refresh ───────────────────────────────────────────────────
  // Keeps displayed stock (and the cart's max-stock guard) accurate when a
  // product is restocked/edited/sold from another session while this
  // cashier has the Billing page open. Debounced so a multi-item bill
  // elsewhere doesn't trigger a refetch per line item.
  useEffect(() => {
    let debounceTimer = null;

    const scheduleRefresh = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => refreshProductsQuietly(), 600);
    };

    const events = [
      "product:stockUpdated",
      "product:created",
      "product:updated",
      "product:deleted",
      "product:restored",
    ];

    events.forEach((evt) => socket.on(evt, scheduleRefresh));

    return () => {
      clearTimeout(debounceTimer);
      events.forEach((evt) => socket.off(evt, scheduleRefresh));
    };
  }, []);

  const available = products.filter(
    (p) => p.stock > 0 && p.name?.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product) => {
    setCart((prev) => {
      const exists = prev.find((i) => i.product._id === product._id);
      if (exists) {
        if (exists.quantity >= product.stock) return prev;
        return prev.map((i) =>
          i.product._id === product._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  // ── Barcode scan handlers ─────────────────────────────────────────────────
  const handleScannedProduct = (product) => {
    if (!product) return;

    if (product.stock <= 0) {
      setScanFeedback({ type: "error", message: `"${product.name}" is out of stock` });
      clearScanFeedback();
      return;
    }

    const existing = cart.find((i) => i.product._id === product._id);
    if (existing && existing.quantity >= product.stock) {
      setScanFeedback({ type: "error", message: `Max stock reached for "${product.name}"` });
      clearScanFeedback();
      return;
    }

    // Ensure the product is in our local `products` list (it may have been
    // filtered out by search), so cart rendering works correctly.
    setProducts((prev) =>
      prev.find((p) => p._id === product._id) ? prev : [...prev, product]
    );

    addToCart(product);
    setScanFeedback({ type: "success", message: `Added "${product.name}" to cart` });
    clearScanFeedback();
  };

  const handleScanNotFound = (code) => {
    setScanFeedback({ type: "error", message: `No product found for code "${code}"` });
    clearScanFeedback();
  };

  const clearScanFeedback = () => {
    window.clearTimeout(window.__scanFeedbackTimer);
    window.__scanFeedbackTimer = window.setTimeout(() => setScanFeedback(null), 3000);
  };

  const setQty = (id, val) => {
    const n = Number(val);
    const max = cart.find((i) => i.product._id === id)?.product.stock || 999;
    if (n <= 0) { setCart((p) => p.filter((i) => i.product._id !== id)); return; }
    if (n > max) return;
    setCart((p) => p.map((i) => i.product._id === id ? { ...i, quantity: n } : i));
  };

  const remove       = (id) => setCart((p) => p.filter((i) => i.product._id !== id));
  const getLinePrice = (item) => item.product.price * (1 - (item.product.discount || 0) / 100) * item.quantity;
  const subtotal     = cart.reduce((s, i) => s + getLinePrice(i), 0);
  const buyerValid   = buyer.name.trim().length > 0 && buyer.phone.trim().length > 0;

  const payBtnLabel = () => {
    if (payment.isLoading)    return <><span className="loader" style={{ width: 12, height: 12 }} /> Processing…</>;
    if (payment.isBankPending) return "✓ Transfer Recorded";
    return {
      upi:           "Pay with Razorpay →",
      card:          "Confirm Card Payment →",
      bank_transfer: "Record Bank Transfer →",
      cash:          "Generate Cash Bill →",
    }[payment.payMethod] || "Select a method above";
  };

  const handlePrint = () => {
    const content = receiptRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank", "width=680,height=900");
    win.document.write(`<html><head><title>Invoice</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;background:#fff}</style>
    </head><body>${content}</body></html>`);
    win.document.close(); win.focus(); win.print();
    setTimeout(() => win.close(), 500);
  };

  const handleDownload = async () => {
    if (!receiptRef.current) return;
    const html2pdf = (await import("html2pdf.js")).default;
    html2pdf().set({
      margin: 8,
      filename: `Invoice-${lastBill?.billId || lastBill?._id}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a5", orientation: "portrait" },
    }).from(receiptRef.current).save();
  };

  if (showHistory) {
  return (
    <div className="anim">
      <PageHeader
        title="Billing"
        subtitle="Sales History"
        action={
          <button
            onClick={() => setShowHistory(false)}
            style={btnPrimary}
          >
            ← Back to Billing
          </button>
        }
      />

      <BillHistory />
    </div>
  );
}

  return (
    <div className="anim">
      <PageHeader
  title="Billing"
  subtitle="Select products and generate a bill"
  action={
    <button
      onClick={() => setShowHistory(!showHistory)}
      style={{
        ...btnPrimary,
        padding: "8px 14px"
      }}
    >
      {showHistory ? "Back to Billing" : "Sales History"}
    </button>
  }
/>


      <div style={{ display: "grid", gridTemplateColumns: "1fr 390px", gap: 18, alignItems: "start" }}>
        

        {/* ── Left: Product List ─────────────────────────────────────────── */}
        <div>
          {step === 0 && (
            <BarcodeScannerPanel
              enabled={step === 0}
              onProductFound={handleScannedProduct}
              onNotFound={handleScanNotFound}
            />
          )}
          {scanFeedback && (
            <div
              style={{
                ...card, padding: "8px 14px", marginBottom: 12, fontSize: 12,
                color: scanFeedback.type === "success" ? colors.green : (colors.red || "#f87171"),
                border: `0.5px solid ${scanFeedback.type === "success" ? colors.green : (colors.red || "#f87171")}33`,
              }}
            >
              {scanFeedback.type === "success" ? "✓ " : "⚠ "}{scanFeedback.message}
            </div>
          )}
          <input
            placeholder="Search products…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...inputBase, maxWidth: "100%", marginBottom: 12 }}
          />
          <div style={{ ...card, overflow: "hidden" }}>
            {loading ? <LoadingState /> : available.length === 0
              ? <EmptyState message="No products in stock." />
              : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `0.5px solid ${colors.border}` }}>
                      <TH>Product</TH><TH>Price</TH><TH>Stock</TH><TH />
                    </tr>
                  </thead>
                  <tbody>
                    {available.map((p) => {
                      const inCart = cart.find((i) => i.product._id === p._id);
                      const maxed  = inCart?.quantity >= p.stock;
                      return (
                        <tr key={p._id} className="hover-row"
                          style={{ borderBottom: "0.5px solid rgba(255,255,255,0.03)" }}>
                          <td style={{ padding: "10px 14px" }}>
                            <p style={{ color: "#fff", fontSize: 13, fontWeight: 300 }}>{p.name}</p>
                            <p style={{ color: "rgba(255,255,255,0.28)", fontSize: 11 }}>{p.category}</p>
                          </td>
                          <td style={{ padding: "10px 14px", color: "rgba(255,255,255,0.55)", fontSize: 13 }}>
                            ₹{Number(p.price).toLocaleString()}
                            {p.discount > 0 && (
                              <span style={{ fontSize: 10, color: colors.green, marginLeft: 5 }}>
                                -{p.discount}%
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "10px 14px", fontSize: 12,
                            color: p.stock <= 5 ? colors.red : "rgba(255,255,255,0.38)" }}>
                            {p.stock}
                          </td>
                          <td style={{ padding: "10px 14px" }}>
                            <button onClick={() => addToCart(p)} disabled={maxed} style={{
                              background: maxed ? "rgba(255,255,255,0.03)" : "rgba(167,139,250,0.08)",
                              border: `0.5px solid ${maxed ? "rgba(255,255,255,0.08)" : "rgba(167,139,250,0.2)"}`,
                              borderRadius: 8, color: maxed ? "rgba(255,255,255,0.2)" : colors.purple,
                              fontSize: 11, padding: "5px 12px", cursor: maxed ? "default" : "pointer",
                            }}>
                              {inCart ? `+1 (${inCart.quantity})` : "+ Add"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
          </div>
        </div>

        {/* ── Right: Checkout Panel ──────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ ...card, padding: 18 }}>

            {/* Step indicator */}
            {step > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
                gap: 0, marginBottom: 18 }}>
                {STEPS.map((_, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center" }}>
                    <StepDot idx={idx} currentIdx={step} />
                    {idx < STEPS.length - 1 && (
                      <div style={{
                        width: 28, height: 1, margin: "0 4px", marginBottom: 16,
                        background: idx < step ? colors.green : "rgba(255,255,255,0.08)",
                        transition: "background 0.3s",
                      }} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ══ STEP 0: CART ══════════════════════════════════════════════ */}
            {step === 0 && (
              <>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em",
                  textTransform: "uppercase", marginBottom: 14 }}>Cart</p>

                {cart.length === 0 ? (
                  <p style={{ color: "rgba(255,255,255,0.18)", fontSize: 12,
                    textAlign: "center", padding: "18px 0" }}>
                    No items added yet
                  </p>
                ) : (
                  <>
                    {cart.map((item) => (
                      <div key={item.product._id} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        marginBottom: 10, paddingBottom: 10,
                        borderBottom: "0.5px solid rgba(255,255,255,0.05)",
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ color: "#fff", fontSize: 12, fontWeight: 300,
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.product.name}
                          </p>
                          <p style={{ color: "rgba(255,255,255,0.28)", fontSize: 11 }}>
                            ₹{getLinePrice(item).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </p>
                        </div>
                        <input
                          type="number" min="1" max={item.product.stock} value={item.quantity}
                          onChange={(e) => setQty(item.product._id, e.target.value)}
                          style={{
                            width: 48, background: "rgba(255,255,255,0.05)",
                            border: `0.5px solid ${colors.border}`, borderRadius: 6,
                            padding: "4px 6px", color: "#fff", fontSize: 12,
                            outline: "none", textAlign: "center",
                          }}
                        />
                        <button onClick={() => remove(item.product._id)} style={{
                          background: "none", border: "none",
                          color: "rgba(248,113,113,0.55)", cursor: "pointer",
                          fontSize: 16, lineHeight: 1, padding: 2,
                        }}>×</button>
                      </div>
                    ))}

                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      padding: "10px 0 0", borderTop: `0.5px solid ${colors.border}`,
                    }}>
                      <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>Subtotal</span>
                      <span style={{ color: "#fff", fontSize: 16, fontWeight: 300 }}>
                        ₹{subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <button onClick={() => setStep(1)} style={{
                      ...btnPrimary, width: "100%", marginTop: 14,
                      padding: "11px", justifyContent: "center", letterSpacing: "0.08em",
                    }}>
                      Continue →
                    </button>
                  </>
                )}
              </>
            )}

            {/* ══ STEP 1: BUYER ═════════════════════════════════════════════ */}
            {step === 1 && (
              <>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em",
                  textTransform: "uppercase", marginBottom: 14 }}>Buyer Information</p>

                <Field label="Full Name *" value={buyer.name}
                  onChange={(e) => setBuyer({ ...buyer, name: e.target.value })}
                  placeholder="Customer name" />
                <Field label="Phone *" value={buyer.phone}
                  onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })}
                  placeholder="+91 XXXXX XXXXX" />
                <Field label="Email" value={buyer.email}
                  onChange={(e) => setBuyer({ ...buyer, email: e.target.value })}
                  placeholder="customer@email.com" />
                <Field label="GST Number" value={buyer.gst}
                  onChange={(e) => setBuyer({ ...buyer, gst: e.target.value })}
                  placeholder="22AAAAA0000A1Z5" />

                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em",
                  textTransform: "uppercase", marginBottom: 10, marginTop: 4 }}>
                  Shipping Address
                </p>
                <Field label="Address" value={buyer.address}
                  onChange={(e) => setBuyer({ ...buyer, address: e.target.value })}
                  placeholder="Street / locality" />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <Field label="City"  value={buyer.city}
                    onChange={(e) => setBuyer({ ...buyer, city:  e.target.value })} placeholder="City" />
                  <Field label="State" value={buyer.state}
                    onChange={(e) => setBuyer({ ...buyer, state: e.target.value })} placeholder="State" />
                </div>
                <Field label="Pincode" value={buyer.pincode}
                  onChange={(e) => setBuyer({ ...buyer, pincode: e.target.value })}
                  placeholder="6-digit PIN" />

                <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                  <BackBtn onClick={() => setStep(0)} />
                  <button onClick={() => setStep(2)} disabled={!buyerValid} style={{
                    ...btnPrimary, flex: 2, padding: "10px", justifyContent: "center",
                    opacity: buyerValid ? 1 : 0.4,
                    cursor: buyerValid ? "pointer" : "default",
                  }}>
                    Payment →
                  </button>
                </div>
              </>
            )}

            {/* ══ STEP 2: PAYMENT ═══════════════════════════════════════════ */}
            {step === 2 && (
              <>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em",
                  textTransform: "uppercase", marginBottom: 14 }}>Payment Method</p>

                {/* Method selector — only shows admin-enabled methods */}
                <PaymentMethodSelector
                  selected={payment.payMethod}
                  onSelect={payment.selectMethod}
                  enabledMethods={payment.enabledMethods}
                  settingsLoading={payment.settingsLoading}
                />

                {/* Per-method panels */}
                {payment.payMethod === "upi" && (
                  <UPIPanel amount={subtotal} companySettings={payment.companySettings} />
                )}
                {payment.payMethod === "card" && (
                  <CardPanel cardDomRef={payment.cardDomRef} cardReady={payment.cardReady} />
                )}
                {payment.payMethod === "cash" && (
                  <CashPanel amount={subtotal} />
                )}
                {payment.payMethod === "bank_transfer" && (
                  payment.isBankPending
                    ? <BankPanel bankInfo={payment.bankInfo} />
                    : <BankHintPanel companySettings={payment.companySettings} />
                )}

                {/* Status bar */}
                <PaymentStatusBar status={payment.status} errorMsg={payment.errorMsg} />

                {/* Total line */}
                {payment.payMethod && !payment.isBankPending && (
                  <div style={{
                    display: "flex", justifyContent: "space-between",
                    padding: "10px 12px", marginTop: 12,
                    background: "rgba(255,255,255,0.03)",
                    borderRadius: 8, border: `0.5px solid ${colors.border}`,
                  }}>
                    <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>Total</span>
                    <span style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>
                      ₹{subtotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                  {!payment.isBankPending && <BackBtn onClick={() => setStep(1)} />}

                  {payment.isBankPending ? (
                    <button
                      onClick={() => { payment.selectMethod(null); setStep(0); }}
                      style={{ ...btnPrimary, flex: 1, padding: "10px", justifyContent: "center" }}>
                      Done ✓
                    </button>
                  ) : (
                    <button
                      onClick={payment.pay}
                      disabled={!payment.canPay || payment.isLoading}
                      style={{
                        ...btnPrimary, flex: 2, padding: "10px", justifyContent: "center",
                        letterSpacing: "0.06em",
                        opacity: payment.canPay && !payment.isLoading ? 1 : 0.4,
                        cursor: payment.canPay && !payment.isLoading ? "pointer" : "default",
                      }}>
                      {payBtnLabel()}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── Receipt ───────────────────────────────────────────────────── */}
          {lastBill && displayCompany && (
            <div className="anim" style={{
              ...card, padding: 0,
              borderColor: "rgba(52,211,153,0.18)", overflow: "hidden",
            }}>
              <ReceiptDocument
                ref={receiptRef}
                bill={lastBill}
                company={displayCompany}
              />
              <div style={{
                display: "flex", gap: 8, padding: "12px 16px",
                borderTop: "0.5px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)",
              }}>
                <button onClick={handlePrint} style={{
                  flex: 1, padding: "8px", borderRadius: 8, fontSize: 11, cursor: "pointer",
                  background: "rgba(255,255,255,0.05)", border: "0.5px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.7)", letterSpacing: "0.06em",
                }}>🖨 Print</button>
                <button onClick={handleDownload} style={{
                  flex: 1, padding: "8px", borderRadius: 8, fontSize: 11, cursor: "pointer",
                  background: "rgba(167,139,250,0.1)", border: "0.5px solid rgba(167,139,250,0.25)",
                  color: "rgba(167,139,250,0.9)", letterSpacing: "0.06em",
                }}>↓ PDF</button>
                <button onClick={() => setLastBill(null)} style={{
                  padding: "8px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer",
                  background: "rgba(248,113,113,0.08)", border: "0.5px solid rgba(248,113,113,0.2)",
                  color: "rgba(248,113,113,0.7)", lineHeight: 1,
                }} title="Dismiss">×</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}