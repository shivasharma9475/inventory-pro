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

export const getStaff = () => safeRequest(API.get("/api/staff"));

export const createStaff = (data) =>
  safeRequest(API.post("/api/staff/create-staff", data));

export const deleteStaff = (id) =>
  safeRequest(API.delete(`/api/staff/${id}`));
