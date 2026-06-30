import API from "../api/axios";

export const createBill = (payload) =>
  API.post("/api/bills", payload);  // ✅ FIXED

export const getBills = (params) =>
  API.get("/api/bills", { params });

export const getBillById = (id) =>
  API.get(`/api/bills/${id}`);

export const getSalesSummary = (params) =>
  API.get("/api/bills/analytics/summary", { params });
