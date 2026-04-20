import axios from "axios";
import { getCookie } from "../utils/cookies";

const apiBaseUrl = (
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8080"
).replace(/\/+$/, "");

const apiClient = axios.create({
  baseURL: apiBaseUrl,
});

let activeGetRequests = 0;
let onApiLoadingChange = () => {};
let hideLoaderTimeout = null;

const updateApiLoading = () => {
  const shouldShowLoader = activeGetRequests > 0;

  if (shouldShowLoader) {
    if (hideLoaderTimeout) {
      clearTimeout(hideLoaderTimeout);
      hideLoaderTimeout = null;
    }

    onApiLoadingChange(true);
    return;
  }

  if (hideLoaderTimeout) {
    clearTimeout(hideLoaderTimeout);
  }

  hideLoaderTimeout = setTimeout(() => {
    onApiLoadingChange(activeGetRequests > 0);
    hideLoaderTimeout = null;
  }, 700);
};

export const setApiLoaderHandler = (handler) => {
  onApiLoadingChange = typeof handler === "function" ? handler : () => {};
  onApiLoadingChange(activeGetRequests > 0);
};

apiClient.interceptors.request.use(
  (config) => {
    const method = (config.method || "").toLowerCase();
    const isGetRequest = method === "get";
    const token = getCookie("token");
    const tokenType = getCookie("tokenType") || "Bearer";

    if (token && !config.headers?.Authorization) {
      config.headers = {
        ...config.headers,
        Authorization: `${tokenType} ${token}`,
      };
    }

    config._trackGetLoader = isGetRequest;

    if (isGetRequest) {
      activeGetRequests += 1;
      updateApiLoading();
    }

    return config;
  },
  (error) => {
    if (error?.config?._trackGetLoader) {
      activeGetRequests = Math.max(0, activeGetRequests - 1);
      updateApiLoading();
    }

    return Promise.reject(error);
  },
);

apiClient.interceptors.response.use(
  (response) => {
    if (response?.config?._trackGetLoader) {
      activeGetRequests = Math.max(0, activeGetRequests - 1);
      updateApiLoading();
    }

    return response;
  },
  (error) => {
    if (error?.config?._trackGetLoader) {
      activeGetRequests = Math.max(0, activeGetRequests - 1);
      updateApiLoading();
    }

    return Promise.reject(error);
  },
);

export const categoryApi = {
  list: () => apiClient.get("/categories"),
  getById: (id) => apiClient.get(`/category/${id}`),
  create: (payload) => apiClient.post("/categories", payload),
  update: (id, payload) => apiClient.put(`/category/${id}`, payload),
  remove: (id) => apiClient.delete(`/category/${id}`),
};

export const unitApi = {
  list: () => apiClient.get("/units"),
  getById: (id) => apiClient.get(`/unit/${id}`),
  create: (payload) => apiClient.post("/units", payload),
  update: (id, payload) => apiClient.put(`/unit/${id}`, payload),
  remove: (id) => apiClient.delete(`/unit/${id}`),
};

export const productApi = {
  list: () => apiClient.get("/products"),
  listByCategoryId: (categoryId) =>
    apiClient.get("/products", {
      params: { categoryId },
    }),
  getById: (id) => apiClient.get(`/product/${id}`),
  create: (payload) => apiClient.post("/products", payload),
  update: (id, payload) => apiClient.put(`/product/${id}`, payload),
  remove: (id) => apiClient.delete(`/product/${id}`),
};

export const customerApi = {
  list: () => apiClient.get("/customers"),
  getById: (id) => apiClient.get(`/customer/${id}`),
  create: (payload) => apiClient.post("/customers", payload),
  update: (id, payload) => apiClient.put(`/customer/${id}`, payload),
  remove: (id) => apiClient.delete(`/customer/${id}`),
};

export const invoiceApi = {
  list: () => apiClient.get("/invoices"),
  getById: (id) => apiClient.get(`/invoice/${id}`),
  getPdf: (id, orientation = "P") =>
    apiClient.get(`/invoice/${id}/pdf`, {
      params: { orientation },
      responseType: "blob",
    }),
  create: (payload) => apiClient.post("/invoices", payload),
  update: (id, payload) => apiClient.put(`/invoice/${id}`, payload),
  remove: (id) => apiClient.delete(`/invoice/${id}`),
};

export const authApi = {
  register: (payload) => apiClient.post("/auth/register", payload),
  login: (payload) => apiClient.post("/auth/login", payload),
  forgotPassword: (payload) => apiClient.post("/auth/forgot-password", payload),
  resetPassword: (payload) => apiClient.post("/auth/reset-password", payload),
  changePassword: (payload) => apiClient.post("/user/change-password", payload),
};

export const userApi = {
  getProfile: () => apiClient.get("/user"),
};

export const settingsApi = {
  getInvoiceSettings: (companyId) =>
    apiClient.get(`/invoice/setting/${companyId}`),
  listCompanies: () => apiClient.get("/companies"),
  listBanks: () => apiClient.get("/banks"),
  getCompanyById: (id) => apiClient.get(`/company/${id}`),
  getBankById: (id) => apiClient.get(`/bank/${id}`),
  createCompany: (payload) => apiClient.post("/companies", payload),
  createBank: (payload) => apiClient.post("/banks", payload),
  deleteCompany: (id) => apiClient.delete(`/company/${id}`),
  deleteBank: (id) => apiClient.delete(`/bank/${id}`),
  saveCompany: (idOrPayload, payload) => {
    if (typeof idOrPayload === "string") {
      return apiClient.put(`/company/${idOrPayload}`, payload);
    }

    return apiClient.put("/company", idOrPayload);
  },
  saveBank: (idOrPayload, payload) => {
    if (typeof idOrPayload === "string") {
      return apiClient.put(`/bank/${idOrPayload}`, payload);
    }

    return apiClient.put("/bank", idOrPayload);
  },
  createInvoiceSetting: (companyId, payload) =>
    apiClient.post(`/invoice/setting/${companyId}`, payload),
  updateInvoiceSetting: (companyId, payload) =>
    apiClient.put(`/invoice/setting/${companyId}`, payload),
  saveInvoice: (idOrPayload, payload) => {
    if (typeof idOrPayload === "string") {
      return apiClient.put(`/invoice/setting/${idOrPayload}`, payload);
    }

    const companyId =
      idOrPayload?.companyId || idOrPayload?.company_id || idOrPayload?.id;

    if (companyId) {
      return apiClient.put(`/invoice/setting/${companyId}`, idOrPayload);
    }

    return apiClient.put("/invoice/setting", idOrPayload);
  },
};

export default apiClient;
