import API from "../api/axios";

export const registerUser = (data) => {
  return API.post("/api/auth/register", data);
};

export const verifyOtp = (data) => {
  return API.post("/api/auth/verify-otp", data);
};

export const resendOtp = (data) => {
  return API.post("/api/auth/resend-otp", data);
}

export const loginUser = (data) => {
  return API.post("/api/auth/login", data);
};

export const forgotPassword = (data) => {
  return API.post("/api/auth/forgot-password", data);
};

export const resetPassword = (data) => {
  return API.post("/api/auth/reset-password", data);
};

export const getMe           = ()         => API.get("/api/auth/me");
export const updateMe        = (data)     => API.put("/api/auth/me", data);
export const changePassword  = (data)     => API.post("/api/auth/change-password", data);
export const uploadProfilePhoto = (imageBase64) =>
  API.put("/api/auth/profile-photo", {
    imageBase64,
  });