import API from "../api/axios";

// 🔥 Helper (safe request wrapper)
const safeRequest = async (req) => {
  try {
    const res = await req;
    return res.data;
  } catch (err) {
    console.error("API ERROR:", err?.response?.data || err.message);
    throw err?.response?.data || { message: "Something went wrong" };
  }
};

// ── Dashboard ─────────────────────────────────────────────
export const getDashboard       = () => safeRequest(API.get("/api/dashboard"));
export const getDashboardStats  = () => safeRequest(API.get("/api/dashboard/stats"));
export const getCategoryStats   = () => safeRequest(API.get("/api/dashboard/category"));

export const getTopSelling      = () => safeRequest(API.get("/api/dashboard/top-selling"));
export const getInventoryValue  = () => safeRequest(API.get("/api/dashboard/value"));
export const getSalesTrend      = () => safeRequest(API.get("/api/dashboard/trend"));
export const getRestockSuggestions = () => safeRequest(API.get("/api/dashboard/restock"));
export const getDeadStock       = () => safeRequest(API.get("/api/dashboard/dead-stock"));
export const getProductMovement = () => safeRequest(API.get("/api/dashboard/movement"));
export const getMonthlySales    = () => safeRequest(API.get("/api/dashboard/monthly-sales"));

// ── Products ──────────────────────────────────────────────
export const getProducts = (tab, page = 1) =>
  safeRequest(
    API.get(`/api/products?tab=${tab}&page=${page}&limit=50`)
  );
export const addProduct = (data) =>
  safeRequest(API.post("/api/products", data));

export const updateProduct = (id, data) =>
  safeRequest(API.put(`/api/products/${id}`, data));

export const deleteProduct = (id) =>
  safeRequest(API.delete(`/api/products/${id}`));

export const updateProductQuantity = (id, stock) =>
  safeRequest(API.patch(`/api/products/${id}/stock`, { stock }));

export const getLowStock = (limit = 5) =>
  safeRequest(API.get(`/api/products/low-stock?limit=${limit}`));

export const restoreProduct = async (id) => {
  try {
    const res = await API.put(`/api/products/restore/${id}`);
    console.log("RESTORE SUCCESS:", res.data);
    return res;
  } catch (err) {
    console.error("RESTORE ERROR:", err.response?.data);
    throw err;
  }
};

export const getActivities = (limit = 2) =>
  safeRequest(
    API.get(`/api/activities?limit=${limit}`)
  );

// Separate from getActivities (used by the small dashboard widget, which
// only ever wants the latest couple of items) — this hits the paginated
// /history endpoint and supports the filters used by the "All Activities"
// modal: page, from/to date range, and userId.
export const getActivityHistory = (params = {}) =>
  safeRequest(API.get("/api/activities/history", { params }));



