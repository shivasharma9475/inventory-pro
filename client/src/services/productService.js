import API from "../api/axios";

const safeRequest = async (req) => {
  try {
    const res = await req;
    return res.data;
  } catch (err) {
    console.error("API ERROR:", err?.response?.data || err.message);
    throw err?.response?.data || { message: "Something went wrong" };
  }
};

// ── Products ──────────────────────────────────────────────
export const getProducts = (tab) => safeRequest(API.get(`/api/products?tab=${tab}`));

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

export const getProductByBarcode = (code) =>
  safeRequest(API.get(`/api/products/barcode/${encodeURIComponent(code)}`));

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