// src/services/companySettingsService.js
import API from "../api/axios";

export const getCompanySettings    = ()        => API.get("/api/company-settings");
export const updateCompanySettings = (data)    => API.put("/api/company-settings", data);
export const uploadCompanyLogo     = (base64)  => API.post("/api/company-settings/upload-logo", { logoBase64: base64 });
export const deleteCompanyLogo     = ()        => API.delete("/api/company-settings/logo");
