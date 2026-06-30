import { useState, useEffect, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import useBarcodeScanner from "../components/hooks/useBarcodeScanner";
import ScanToAddButton from "../components/products/ScanToAddButton";
import {
  getProducts,
  addProduct,
  deleteProduct,
  updateProduct,
  updateProductQuantity,
  restoreProduct,
  getLowStock,
} from "../services/dashboardService";
import { getProductByBarcode } from "../services/productService";
import ExportButton from "../components/common/ExportButton";
import { exportProducts } from "../services/exportService";
import {
  PageHeader,
  Modal,
  FormField,
  LoadingState,
  EmptyState,
  Badge,
} from "../components/dashboard/ui/index";
import {
  card,
  btnPrimary,
  btnDanger,
  btnGhost,
  colors,
  inputBase,
} from "../components/dashboard/styles/tokens";
import socket from "../socket";

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const EMPTY_FORM = {
  name: "",
  sku: "",
  barcode: "",
  category: "",
  price: "",
  costPrice: "",
  stock: "",
  lowStockThreshold: "10",
  seller: "",
  discount: "",
  unit: "pcs",
  description: "",
};


/* ─────────────────────────────────────────────
   Tiny style helpers (extend your tokens)
───────────────────────────────────────────── */
const S = {
  page: { fontFamily: "'DM Sans', sans-serif" },

  statRow: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    background: "rgba(255,255,255,0.03)",
    border: `0.5px solid ${colors.border}`,
    borderRadius: 10,
    padding: "14px 16px",
  },
  statLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.28)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  statVal: { fontSize: 20, fontWeight: 500, color: "#fff" },
  statSub: { fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 2 },

  tabStrip: {
    display: "flex",
    gap: 2,
    background: "rgba(255,255,255,0.03)",
    border: `0.5px solid ${colors.border}`,
    borderRadius: 9,
    padding: 3,
    width: "fit-content",
    marginBottom: 14,
  },
  tab: (active) => ({
    padding: "5px 14px",
    borderRadius: 7,
    fontSize: 12,
    fontWeight: 500,
    color: active ? "#fff" : "rgba(255,255,255,0.3)",
    background: active ? "rgba(255,255,255,0.07)" : "transparent",
    cursor: "pointer",
    transition: "all 0.15s",
    userSelect: "none",
  }),
  tabCount: (active) => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: active ? "rgba(124,110,240,0.2)" : "rgba(255,255,255,0.07)",
    color: active ? colors.purple : "rgba(255,255,255,0.3)",
    borderRadius: 10,
    padding: "1px 6px",
    fontSize: 10,
    marginLeft: 5,
  }),

  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  filterSelect: {
  background: "#0d0e16",                // ✅ dark bg
  color: "#fff",                       // ✅ white text
  border: "0.5px solid rgba(255,255,255,0.12)",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 12,
  outline: "none",
  cursor: "pointer",
  appearance: "none",                  // ✅ remove default arrow
},

  TH: {
    padding: "10px 14px",
    textAlign: "left",
    fontSize: 10,
    color: "rgba(255,255,255,0.28)",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    fontWeight: 400,
    whiteSpace: "nowrap",
  },

  avatarCell: {
    width: 28,
    height: 28,
    borderRadius: 7,
    background: "rgba(255,255,255,0.05)",
    border: `0.5px solid ${colors.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 600,
    color: colors.purple,
    flexShrink: 0,
  },

  stockBarWrap: { display: "flex", alignItems: "center", gap: 8 },
  stockBarTrack: {
    height: 3,
    background: "rgba(255,255,255,0.07)",
    borderRadius: 2,
    width: 50,
    overflow: "hidden",
  },

  qtyInput: {
    width: 58,
    background: "rgba(255,255,255,0.06)",
    border: `0.5px solid ${colors.purple}55`,
    borderRadius: 6,
    padding: "4px 8px",
    color: "#fff",
    fontSize: 12,
    outline: "none",
    fontFamily: "inherit",
  },

  badge: (color, bg) => ({
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 7px",
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: "0.05em",
    background: bg,
    color: color,
  }),

  formGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 11,
  },

  lowStockRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: `0.5px solid ${colors.border}`,
  },

  // Role badge shown in header area
  roleBadge: (isAdmin) => ({
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 9px",
    borderRadius: 6,
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    background: isAdmin ? "rgba(124,110,240,0.15)" : "rgba(255,255,255,0.06)",
    color: isAdmin ? colors.purple : "rgba(255,255,255,0.4)",
    border: `0.5px solid ${isAdmin ? colors.purple + "44" : "rgba(255,255,255,0.1)"}`,
  }),
};

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */
function StatCard({ label, value, sub, valueStyle }) {
  return (
    <div style={S.statCard}>
      <div style={S.statLabel}>{label}</div>
      <div style={{ ...S.statVal, ...valueStyle }}>{value}</div>
      <div style={S.statSub}>{sub}</div>
    </div>
  );
}

function TabStrip({ tab, onSelect, activeCounts }) {
  return (
    <div style={S.tabStrip}>
      {["active", "deleted"].map((t) => (
        <div key={t} style={S.tab(tab === t)} onClick={() => onSelect(t)}>
          {t.charAt(0).toUpperCase() + t.slice(1)}
          <span style={S.tabCount(tab === t)}>{activeCounts[t] ?? 0}</span>
        </div>
      ))}
    </div>
  );
}

function StockBar({ stock, minStock, maxStock }) {
  const threshold = minStock || 5;
  const pct = Math.min(100, Math.round((stock / Math.max(maxStock, 1)) * 100));
  const color =
    stock === 0 ? colors.red : stock <= threshold ? "#f0a429" : colors.green;
  return (
    <div style={S.stockBarWrap}>
      <span style={{ color, fontSize: 13, minWidth: 26 }}>{stock}</span>
      {stock === 0 ? (
        <span style={S.badge(colors.red, "rgba(240,89,90,0.12)")}>OUT</span>
      ) : stock <= threshold ? (
        <span style={S.badge("#f0a429", "rgba(240,164,41,0.12)")}>LOW</span>
      ) : null}
      <div style={S.stockBarTrack}>
        <div
          style={{
            height: "100%",
            borderRadius: 2,
            width: `${pct}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function Products() {
  // ── RBAC: Derive role from user object (secure & clean) ──
  const { user } = useOutletContext();
  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";

  // ── Data ──
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  // ── UI state ──
  const [tab, setTab] = useState("active");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [sortKey, setSortKey] = useState("");

  // ── Export: optional "select specific rows" mode ──
  // Off by default — exporting the current filtered/search view (the
  // common case) needs no selection at all. Turning this on reveals
  // checkboxes so the export can be narrowed to exactly the checked rows.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Add / Edit modal ──
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // While the Add/Edit modal is open, scanning a barcode fills the Barcode field
  // directly — handy for onboarding new inventory with a scanner.
  useBarcodeScanner(
    (code) => setForm((f) => ({ ...f, barcode: code })),
    { enabled: showForm && isAdmin }
  );

  // "Scan to Add" — when a scanned barcode matches an existing product,
  // show a small prompt offering Edit or Quick Restock instead of creating a duplicate.
  const [scanMatch, setScanMatch] = useState(null); // { product, code }
  const [restockQty, setRestockQty] = useState("");

  // ── Inline qty edit ──
  const [editQtyId, setEditQtyId] = useState(null);
  const [qtyVal, setQtyVal] = useState("");
  const [qtyLoading, setQtyLoading] = useState(false);

  // ── Low stock modal ──
  const [showLowStock, setShowLowStock] = useState(false);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [lowStockLoading, setLowStockLoading] = useState(false);

  const [showSelect, setShowSelect] = useState(true);

  /* ── Load products ── */
  const load = useCallback(() => {
  setLoading(true);

  getProducts(tab, page)
    .then((r) => {
      console.log("API:", r);

      setProducts((prev) =>
        page === 1 ? (r.data || []) : [...prev, ...(r.data || [])]
      );

      setTotalProducts(r.totalProducts || 0);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, [tab, page]);

  useEffect(() => {
    load();
  }, [load, tab]);

  // ── Real-time refresh ───────────────────────────────────────────────────
  // Stock/product changes can come from this admin's own actions, another
  // admin's session, or a sale on the Billing page — debounce so a burst of
  // events (e.g. a multi-item bill) triggers one refetch, not several.
  useEffect(() => {
    let debounceTimer = null;

    const scheduleRefresh = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => load(), 600);
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
  }, [load]);

  useEffect(() => {
  console.log("Products:", products);
}, [products]);

  /* ── Derived stats ── */
  const active = products.filter((p) => p.isActive);
const deleted = products.filter((p) => !p.isActive);
  const lowCount = active.filter((p) => p.stock <= (p.minStock || 5)).length;
  const avgPrice = active.length
    ? Math.round(active.reduce((s, p) => s + p.price, 0) / active.length)
    : 0;
  const categories = [
    ...new Set(active.map((p) => p.category).filter(Boolean)),
  ];

  const headerBtnStyle = {
  height: 36,
  minWidth: 110,
  padding: "0 14px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  fontSize: 12,
};

  /* ── Filtered / sorted list ── */
  const baseList = tab === "deleted" ? deleted : active;
  const filtered = baseList
    .filter(
      (p) =>
        (!search ||
          p.name?.toLowerCase().includes(search.toLowerCase()) ||
          p.category?.toLowerCase().includes(search.toLowerCase()) ||
          p.seller?.toLowerCase().includes(search.toLowerCase()) ||
          p.sku?.toLowerCase().includes(search.toLowerCase())) &&
        (!catFilter || p.category === catFilter)
    )
    .sort((a, b) => {
      if (sortKey === "price-asc") return a.price - b.price;
      if (sortKey === "price-desc") return b.price - a.price;
      if (sortKey === "stock-asc") return a.stock - b.stock;
      if (sortKey === "stock-desc") return b.stock - a.stock;
      if (sortKey === "name-asc") return a.name.localeCompare(b.name);
      return 0;
    });

  const maxStock = Math.max(...filtered.map((p) => p.stock), 1);

  /* ────────────────────────────────
     Handlers — RBAC guards on all write ops
  ──────────────────────────────── */

  const upd = (field) => (e) => {
  let value = e.target.value;

  // ✅ Convert number fields automatically
  const numberFields = [
    "price",
    "costPrice",
    "stock",
    "lowStockThreshold",
    "minStock",
    "discount",
  ];

  if (numberFields.includes(field)) {
    value = value === "" ? "" : Number(value);
  }

  setForm((prev) => ({
    ...prev,
    [field]: value,
  }));
};
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.price || isNaN(form.price)) e.price = "Valid number required";
    if (!form.category) e.category = "Required";
    if (!form.stock || isNaN(form.stock)) e.stock = "Valid number required";
    return e;
  };

  // Guard: only admin can open add form
  const openAdd = () => {
    if (!isAdmin) return;
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setShowForm(true);
  };

  // ── Scan to Add handlers ───────────────────────────────────────────────────
  const handleScanExisting = (product, code) => {
    setScanMatch({ product, code });
    setRestockQty("");
  };

  const handleScanNew = (code) => {
    // No existing product → open Add form pre-filled with the scanned barcode
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, barcode: code });
    setErrors({});
    setShowForm(true);
  };

  // ── Standalone USB/Bluetooth scanner — scan-anywhere lookup ───────────────
  // Mirrors ScanToAddButton's camera flow (existing → restock/edit prompt,
  // new → prefilled Add form), but for a USB/HID scanner used directly on
  // the page without opening any modal first. Previously the USB scanner
  // only worked *inside* the Add/Edit form to fill the barcode field — a
  // USB-only user had no equivalent to the camera's "scan to add" flow.
  const [usbScanLooking, setUsbScanLooking] = useState(false);

  const handleStandaloneScan = useCallback(
    async (code) => {
      setUsbScanLooking(true);
      try {
        const res = await getProductByBarcode(code);
        const found =
          res?.data?.data ?? res?.data?.product ?? res?.data ?? res?.product ?? null;

        if (found && typeof found === "object" && found._id) {
          handleScanExisting(found, code);
        } else {
          handleScanNew(code);
        }
      } catch (err) {
        // 404 / not found → treat as a brand-new barcode, same as the camera flow
        handleScanNew(code);
      } finally {
        setUsbScanLooking(false);
      }
    },
    [] // handleScanExisting/handleScanNew close over state setters only — stable across renders
  );

  // Only active when no modal is already capturing scanner input — avoids a
  // USB scan being interpreted twice (once by the form's barcode-fill
  // listener, once by this lookup) while either modal is open.
  useBarcodeScanner(handleStandaloneScan, {
    enabled: isAdmin && !showForm && !scanMatch,
  });

  const handleQuickRestockSubmit = async () => {
    if (!scanMatch) return;
    const qty = Number(restockQty);
    if (!qty || qty <= 0) return;

    const newStock = (scanMatch.product.stock || 0) + qty;
    try {
      await updateProductQuantity(scanMatch.product._id, newStock);
      setScanMatch(null);
      setRestockQty("");
      load(); // refresh list
    } catch (err) {
      console.error("Quick restock failed:", err);
    }
  };

  const closeScanMatch = () => {
    setScanMatch(null);
    setRestockQty("");
  };

  // Guard: only admin can open edit form
  const openEdit = (product) => {
    if (!isAdmin) return;
    setEditTarget(product);
    setForm({
      name: product.name || "",
      sku: product.sku || "",
      barcode: product.barcode || "",
      price: String(product.price || ""),
      costPrice: String(product.costPrice || ""),
      stock: String(product.stock || ""),
      lowStockThreshold: String(product.lowStockThreshold || "10"),
      minStock: String(product.minStock || 5),
      category: product.category || "",
      seller: product.seller || "",
      discount: String(product.discount ?? 0),
      unit: product.unit || "pcs",
      description: product.description || "",
    });
    setErrors({});
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditTarget(null);
    setErrors({});
  };

  // Guard: only admin can save
  const handleSave = async () => {
    if (!isAdmin) return;
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setSaving(true);

    const payload = {
  name: form.name?.trim(),
  sku: form.sku?.trim() || undefined,
  barcode: form.barcode?.trim() || undefined,
  price: Number(form.price) || 0,
  costPrice: Number(form.costPrice) || 0,

  stock: Number(form.stock) || 0,

  lowStockThreshold: Number(form.lowStockThreshold) || 10,
  minStock: Number(form.minStock) || 5,

  category: form.category || "",
  description: form.description || "",

  seller: form.seller?.trim() || "Unknown Supplier", // ✅ FIX

  discount: form.discount === "" ? 0 : Number(form.discount),

  unit: form.unit || "pcs",
};
    try {
      if (editTarget) {
        await updateProduct(editTarget._id, payload);
      } else {
        await addProduct(payload);
      }
      closeForm();
      load();
    } catch (err) {
      setErrors({
        name: err.response?.data?.message || "Failed to save",
      });
    } finally {
      setSaving(false);
    }
  };

  // Guard: only admin can delete
  const handleDelete = async (id) => {
    if (!isAdmin) return;
    if (!window.confirm("Move this product to deleted?")) return;
    try {
      await deleteProduct(id);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete");
    }
  };

  // Guard: only admin can restore
  const handleRestore = async (id) => {
    if (!isAdmin) return;
    try {
      await restoreProduct(id);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to restore");
    }
  };

  // ── Export ──
  // If specific rows are checked (selectMode), export exactly those —
  // otherwise export whatever the current search/category/tab filters
  // resolve to server-side (matching what's shown on screen, just
  // re-filtered by the backend rather than re-using the client-side list).
  const handleExportProducts = async (formatKey) => {
    const filters =
      selectedIds.size > 0
        ? { productIds: Array.from(selectedIds).join(",") }
        : { search, category: catFilter, tab };

    return exportProducts(formatKey, filters);
  };

  // Qty update: admin + staff both allowed
  const handleQtySave = async () => {
    if (!qtyVal || isNaN(qtyVal)) return;
    setQtyLoading(true);
    try {
      await updateProductQuantity(editQtyId, Number(qtyVal));
      setEditQtyId(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update stock");
    } finally {
      setQtyLoading(false);
    }
  };

  // Low stock: visible to all roles
   const openLowStock = async () => {
  setShowLowStock(true);
  setLowStockLoading(true);

  try {
    const r = await getLowStock();
    console.log("API RESPONSE:", r);

    setLowStockItems(r.data || []);
  } catch (err) {
    console.log("ERROR:", err);
    setLowStockItems([]);
  } finally {
    setLowStockLoading(false);
  }
};

  /* ────────────────────────────────
     Render
  ──────────────────────────────── */
  return (
    <div className="anim" style={S.page}>
      {/* ── Header ── */}
      <PageHeader
        title="Products"
        subtitle={
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {`${active.length} active · ${deleted.length} deleted`}
            {/* Role badge — visual indicator for current user's role */}
            <span style={S.roleBadge(isAdmin)}>
              {isAdmin ? "Admin" : isStaff ? "Staff" : "Viewer"}
            </span>
          </span>
        }
        action={
          <div style={{ display: "flex", gap: 8 }}>
            {/* Low Stock — visible to ALL roles */}
            <button
              style={{
  ...btnGhost,
  ...headerBtnStyle,
}}
              onClick={openLowStock}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M6 2v4M6 8.5v.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
                <circle
                  cx="6"
                  cy="6"
                  r="5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
              </svg>
              Low Stock
              {lowCount > 0 && (
                <span
  style={{
    background: "rgba(240,89,90,0.2)",
    color: colors.red,
    borderRadius: 8,
    padding: "0 6px",
    fontSize: 10,
    marginLeft: 4,
  }}
>
  {lowCount}
</span>
              )}
            </button>

            {/* Scan to Add — ADMIN ONLY */}
            {isAdmin && (
              <ScanToAddButton
                onExistingFound={handleScanExisting}
                onNewBarcode={handleScanNew}
              />
            )}

            {/* USB/Bluetooth scan-anywhere feedback — fires for any HID
                scanner input on this page while no modal is open (see
                handleStandaloneScan above). */}
            {isAdmin && usbScanLooking && (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", alignSelf: "center" }}>
                Looking up scanned barcode…
              </span>
            )}

            {/* Select rows — optional, only needed for "export selected
                products only". Off by default since exporting the current
                filtered/search view doesn't need any selection. */}
            {showSelect && (
  <button
    onClick={() => {
      setSelectMode((prev) => !prev);
      setSelectedIds(new Set());
    }}
    style={{
      ...btnGhost,
      ...headerBtnStyle,
    }}
  >
    {selectMode
      ? `Cancel (${selectedIds.size})`
      : "Select"}
  </button>
)}

            <ExportButton
  label="Export"
  formats={[
    { key: "excel", label: "Excel (.xlsx)" },
    { key: "csv", label: "CSV" },
  ]}
  onExport={handleExportProducts}
  style={headerBtnStyle}
/>

            {/* Add Product — ADMIN ONLY (disabled + dimmed for staff) */}
            {isAdmin && (
  <button
  style={{
    ...btnPrimary,
    ...headerBtnStyle,
    minWidth: 140,
  }}
  onClick={openAdd}
>
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <path
        d="M5.5 1v9M1 5.5h9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
    Add Product
  </button>
)}
          </div>
        }
      />

      {/* ── Stats ── */}
      <div style={S.statRow}>
        <StatCard
  label="Total Products"
  value={totalProducts}
  sub="active"
/>
        <StatCard
          label="Low Stock"
          value={lowCount}
          sub="items ≤ threshold"
          valueStyle={{ color: lowCount > 0 ? colors.red : colors.green }}
        />
        <StatCard label="Categories" value={categories.length} sub="unique" />
        <StatCard
          label="Avg Price"
          value={`₹${avgPrice.toLocaleString("en-IN")}`}
          sub="across catalog"
        />
      </div>

      {/* ── Tabs ── */}
      <TabStrip
  tab={tab}
  onSelect={(newTab) => {
    setTab(newTab);
    setPage(1);
    setProducts([]);
  }}
        activeCounts={{ active: active.length, deleted: deleted.length }}
      />

      {/* ── Toolbar ── */}
      <div style={S.toolbar}>
        <input
          placeholder="Search name, category, seller…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputBase, maxWidth: 260 }}
        />
        <select
          style={S.filterSelect}
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          style={S.filterSelect}
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
        >
          <option value="">Sort: Default</option>
          <option value="price-asc">Price ↑</option>
          <option value="price-desc">Price ↓</option>
          <option value="stock-asc">Stock ↑</option>
          <option value="stock-desc">Stock ↓</option>
          <option value="name-asc">Name A → Z</option>
        </select>
      </div>

      {/* ── Table ── */}
      <div style={{ ...card, overflow: "hidden" }}>
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            message={
              search
                ? "No products match your search."
                : tab === "deleted"
                ? "No deleted products."
                : "No products yet."
            }
          />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr
                style={{ borderBottom: `0.5px solid rgba(255,255,255,0.08)` }}
              >
                {selectMode && (
                  <th style={{ ...S.TH, width: 36 }}>
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && filtered.every((p) => selectedIds.has(p._id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(filtered.map((p) => p._id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                    />
                  </th>
                )}
                {[
                  "Name",
                  "SKU",
                  "Category",
                  "Stock",
                  "Price",
                  "Seller",
                  "Discount",
                  "Actions",
                ].map((h) => (
                  <th key={h} style={S.TH}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <ProductRow
                  key={p._id}
                  product={p}
                  isAdmin={isAdmin}
                  isDeleted={tab === "deleted"}
                  maxStock={maxStock}
                  editQtyId={editQtyId}
                  qtyVal={qtyVal}
                  qtyLoading={qtyLoading}
                  setEditQtyId={setEditQtyId}
                  setQtyVal={setQtyVal}
                  onQtySave={handleQtySave}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onRestore={handleRestore}
                  selectMode={selectMode}
                  isSelected={selectedIds.has(p._id)}
                  onToggleSelect={() => toggleSelected(p._id)}
                />
              ))}
            </tbody>
          </table>
          
        )}
        {products.length < totalProducts && (
  <div
    style={{
      padding: "20px",
      textAlign: "center",
    }}
  >
    <button
      style={btnPrimary}
      onClick={() => setPage((prev) => prev + 1)}
    >
      View More
    </button>
  </div>
)}
      </div>

      {/* ── Add / Edit Modal — ADMIN ONLY ── */}
      {showForm && isAdmin && (
        <Modal
          title={editTarget ? "Edit Product" : "Add Product"}
          onClose={closeForm}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <FormField
              label="Product Name"
              id="pname"
              placeholder="e.g. Wireless Mouse"
              value={form.name}
              onChange={upd("name")}
              error={errors.name}
              required
            />

            <FormField
  label="SKU"
  id="psku"
  placeholder="e.g. SKU-123"
  value={form.sku}
  onChange={upd("sku")}
/>

            <FormField
  label="Barcode"
  id="pbarcode"
  placeholder="e.g. 8901234567890 (scan or type)"
  value={form.barcode}
  onChange={upd("barcode")}
/>

            <div style={S.formGrid}>
              <FormField
                label="Price (₹)"
                id="pprice"
                type="number"
                placeholder="0"
                value={form.price}
                onChange={upd("price")}
                error={errors.price}
                required
              />
              <FormField
                label="Stock"
                id="pstock"
                type="number"
                placeholder="0"
                value={form.stock}
                onChange={upd("stock")}
                error={errors.stock}
                required
              />
            </div>

            <div style={S.formGrid}>
              <FormField
                label="Min Stock (threshold)"
                id="pminstock"
                type="number"
                placeholder="5"
                value={form.minStock}
                onChange={upd("minStock")}
              />
              <div>
  <label
    style={{
      display: "block",
      marginBottom: 6,
      fontSize: 12,
      color: "#fff",
    }}
  >
    Category *
  </label>

  <input
    list="categories"
    value={form.category}
    onChange={upd("category")}
    placeholder="Select or create category"
    style={inputBase}
  />

  <datalist id="categories">
    {categories.map((cat) => (
      <option key={cat} value={cat} />
    ))}
  </datalist>
</div>
            </div>

            <div style={S.formGrid}>
              <FormField
                label="Seller"
                id="pseller"
                placeholder="Supplier name"
                value={form.seller}
                onChange={upd("seller")}
              />
              <FormField
                label="Discount (%)"
                id="pdisc"
                type="number"
                placeholder="0"
                value={form.discount}
                onChange={upd("discount")}
              />
            </div>

            <FormField
              label="Description"
              id="pdesc"
              placeholder="Short description (optional)"
              value={form.description}
              onChange={upd("description")}
            />

            <div style={{ display: "flex", gap: 9, marginTop: 4 }}>
              <button
                onClick={closeForm}
                style={{
                  ...btnGhost,
                  flex: 1,
                  padding: "10px",
                  justifyContent: "center",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  ...btnPrimary,
                  flex: 1,
                  padding: "10px",
                  justifyContent: "center",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? (
                  <span className="loader" />
                ) : editTarget ? (
                  "Save Changes"
                ) : (
                  "Add Product"
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Low Stock Modal — ALL roles ── */}
      {showLowStock && (
        <Modal
          title="Low Stock Alert"
          onClose={() => setShowLowStock(false)}
        >
          {lowStockLoading ? (
            <LoadingState />
          ) : lowStockItems.length === 0 ? (
            <EmptyState message="No low stock items. Inventory looks healthy!" />
          ) : (
            <div>
              {lowStockItems.map((p) => (
                <div key={p._id} style={S.lowStockRow}>
                  <div>
                    <div style={{ fontSize: 13, color: "#fff", fontWeight: 400 }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                      {p.category} · Min: {p.minStock || 5}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: p.stock === 0 ? colors.red : "#f0a429",
                      }}
                    >
                      {p.stock}
                    </span>
                    {p.stock === 0 ? (
                      <Badge label="OUT" color={colors.red} />
                    ) : (
                      <Badge label="LOW" color="#f0a429" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div
            style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}
          >
            <button
              style={{ ...btnGhost, padding: "8px 18px" }}
              onClick={() => setShowLowStock(false)}
            >
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* ── Scan to Add: Existing Product Match — ADMIN ONLY ── */}
      {scanMatch && (
        <Modal title="Product Already Exists" onClose={closeScanMatch}>
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
              Scanned code <strong>{scanMatch.code}</strong> matches{" "}
              <strong>{scanMatch.product.name}</strong>.
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
              Current stock: {scanMatch.product.stock} {scanMatch.product.unit || "pcs"}
            </div>

            <FormField
              label="Quick Restock — Add Quantity"
              id="restockQty"
              type="number"
              placeholder="e.g. 20"
              value={restockQty}
              onChange={(e) => setRestockQty(e.target.value)}
            />

            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={{ ...btnGhost, flex: 1, padding: "8px 0" }}
                onClick={() => {
                  closeScanMatch();
                  openEdit(scanMatch.product);
                }}
              >
                Edit Product
              </button>
              <button
                style={{ ...btnPrimary, flex: 1, padding: "8px 0" }}
                onClick={handleQuickRestockSubmit}
                disabled={!restockQty || Number(restockQty) <= 0}
              >
                Add Stock →
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ProductRow — with full RBAC on all actions
───────────────────────────────────────────── */
function ProductRow({
  product: p,
  isAdmin,
  isDeleted,
  maxStock,
  editQtyId,
  qtyVal,
  qtyLoading,
  setEditQtyId,
  setQtyVal,
  onQtySave,
  onEdit,
  onDelete,
  onRestore,
  selectMode = false,
  isSelected = false,
  onToggleSelect,
}) {
  const isEditingQty = editQtyId === p._id;

  return (
    <tr
      className="hover-row"
      style={{
        borderBottom: `0.5px solid rgba(255,255,255,0.025)`,
        opacity: isDeleted ? 0.5 : 1,
        background: isSelected ? "rgba(124,110,240,0.06)" : undefined,
      }}
    >
      {selectMode && (
        <td style={{ padding: "10px 14px" }}>
          <input type="checkbox" checked={isSelected} onChange={onToggleSelect} />
        </td>
      )}
      {/* Name */}
      <td style={{ padding: "10px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              background: "rgba(255,255,255,0.05)",
              border: `0.5px solid ${colors.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 600,
              color: colors.purple,
              flexShrink: 0,
            }}
          >
            {p.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ color: "#fff", fontSize: 13, fontWeight: 300 }}>
              {p.name}
            </div>
            {p.description && (
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>
                {p.description}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* sku */}

      <td
  style={{
    padding: "10px 14px",
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    fontWeight: 400,
    letterSpacing: "0.03em",
  }}
>
  {p.sku || "—"}
</td>

      {/* Category */}
      <td style={{ padding: "10px 14px" }}>
        {p.category ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 7px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.05em",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.55)",
            }}
          >
            {p.category}
          </span>
        ) : (
          <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>
        )}
      </td>

      {/* Stock */}
      <td style={{ padding: "10px 14px" }}>
        {isEditingQty ? (
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <input
              type="number"
              value={qtyVal}
              onChange={(e) => setQtyVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onQtySave()}
              autoFocus
              style={{
                width: 58,
                background: "rgba(255,255,255,0.06)",
                border: `0.5px solid ${colors.purple}55`,
                borderRadius: 6,
                padding: "4px 8px",
                color: "#fff",
                fontSize: 12,
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              onClick={onQtySave}
              disabled={qtyLoading}
              style={{ ...btnPrimary, padding: "4px 10px", fontSize: 11 }}
            >
              {qtyLoading ? (
                <span className="loader" style={{ width: 10, height: 10 }} />
              ) : (
                "✓"
              )}
            </button>
            <button
              onClick={() => setEditQtyId(null)}
              style={{ ...btnGhost, padding: "4px 8px", fontSize: 11 }}
            >
              ✕
            </button>
          </div>
        ) : (
          <StockBar stock={p.stock} minStock={p.minStock} maxStock={maxStock} />
        )}
      </td>

      {/* Price */}
      <td style={{ padding: "10px 14px" }}>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
          ₹{Number(p.price).toLocaleString("en-IN")}
        </div>
        {p.discount > 0 && (
          <div style={{ fontSize: 10, color: "#3dd68c" }}>
            -{p.discount}% off
          </div>
        )}
      </td>

      {/* Seller */}
      <td
        style={{
          padding: "10px 14px",
          color: "rgba(255,255,255,0.35)",
          fontSize: 12,
        }}
      >
        {p.seller || "—"}
      </td>

      {/* Discount */}
      <td style={{ padding: "10px 14px" }}>
        {p.discount > 0 ? (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "2px 7px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: "0.05em",
              background: "rgba(61,214,140,0.12)",
              color: "#3dd68c",
            }}
          >
            {p.discount}%
          </span>
        ) : (
          <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>
        )}
      </td>

      {/* ── Actions — RBAC applied here ── */}
      <td style={{ padding: "10px 14px" }}>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {isDeleted ? (
            /* Restore — ADMIN ONLY */
            isAdmin ? (
              <button
                onClick={() => onRestore(p._id)}
                style={{
                  ...btnGhost,
                  padding: "5px 10px",
                  color: "#f0a429",
                  borderColor: "rgba(240,164,41,0.3)",
                }}
              >
                Restore
              </button>
            ) : (
              /* Staff sees disabled restore */
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.2)",
                  padding: "5px 0",
                }}
                title="Only admins can restore products"
              >
                No access
              </span>
            )
          ) : (
            <>
              {/* Qty update — ADMIN + STAFF both can do this */}
              {!isEditingQty && (
                <button
                  onClick={() => {
                    setEditQtyId(p._id);
                    setQtyVal(String(p.stock));
                  }}
                  style={{ ...btnGhost, padding: "5px 10px" }}
                  title="Update stock quantity"
                >
                  Qty
                </button>
              )}

              {/* Edit — ADMIN ONLY (disabled + dimmed for staff) */}
              {isAdmin && (
  <button
    onClick={() => onEdit(p)}
    style={{
      ...btnGhost,
      padding: "5px 8px",
    }}
  >
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path
        d="M8.5 1.5l2 2L3 11H1V9L8.5 1.5z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  </button>
)}

              {isAdmin && (
  <button
    onClick={() => onEdit(p)}
    style={{ ...btnGhost, padding: "5px 8px" }}
  >
    {/* icon */}
  </button>
)}

{isAdmin && (
  <button
    onClick={() => onDelete(p._id)}
    style={{ ...btnDanger, padding: "5px 10px" }}
  >
    Del
  </button>
)}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}