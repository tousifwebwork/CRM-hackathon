import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

/* ---------- Token storage (localStorage) ---------- */
const TOKEN_KEY = "crm_token";
const USER_KEY = "crm_user";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const isAuthenticated = () => Boolean(getToken());
export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY));
  } catch {
    return null;
  }
};
export const saveAuth = (token, user) => {
  localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
};
export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

/* ---------- Axios client ---------- */
const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// Attach JWT to every request that has one
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Expired/invalid token: clear it and let the layout redirect to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || "";
    const isAuthForm = url.includes("/auth/login") || url.includes("/auth/register");
    if (error.response?.status === 401 && !isAuthForm && getToken()) {
      clearAuth();
      window.dispatchEvent(new Event("crm:unauthorized"));
    }
    return Promise.reject(error);
  }
);

/* ---------- Helpers ---------- */
export const getErrorMessage = (error, fallback = "Something went wrong. Please try again.") => {
  const data = error?.response?.data;
  if (data?.message) return data.message;
  if (data?.error) return typeof data.error === "string" ? data.error : fallback;
  if (error?.request && !error?.response) return "Cannot reach the server. Check your connection and try again.";
  return error?.message || fallback;
};

const asList = (data, key) => (Array.isArray(data) ? data : Array.isArray(data?.[key]) ? data[key] : []);

// A login/register response only counts as success when it carries a token
const handleAuthResponse = (data) => {
  if (!data?.token) throw new Error(data?.message || "The server did not return a login token.");
  saveAuth(data.token, data.user);
  return data;
};

/* ---------- Authentication ---------- */
export const registerUser = async (payload) => {
  const { data } = await api.post("/api/auth/register", payload);
  return handleAuthResponse(data);
};

export const loginUser = async (payload) => {
  const { data } = await api.post("/api/auth/login", payload);
  return handleAuthResponse(data);
};

// Always clears local auth, even if the server call fails
export const logoutUser = async () => {
  try {
    await api.post("/api/auth/logout");
  } finally {
    clearAuth();
  }
};

export const getProfile = async () => {
  const { data } = await api.get("/api/auth/profile");
  return data?.user || data;
};

export const updateProfile = async (payload) => {
  const { data } = await api.put("/api/auth/profile", payload);
  const user = data?.user || data;
  if (user && getToken()) saveAuth(getToken(), user);
  return { message: data?.message, user };
};

export const changePassword = async (payload) => {
  const { data } = await api.put("/api/auth/change-password", payload);
  return data;
};

/* ---------- Leads ---------- */
export const getLeads = async () => {
  const { data } = await api.get("/api/leads");
  return asList(data, "leads");
};
export const createLead = async (payload) => (await api.post("/api/leads", payload)).data;
export const updateLead = async (id, payload) => (await api.put(`/api/leads/${id}`, payload)).data;
export const deleteLead = async (id) => (await api.delete(`/api/leads/${id}`)).data;

/* ---------- Services ---------- */
export const getServices = async () => {
  const { data } = await api.get("/api/services");
  return asList(data, "services");
};
export const createService = async (payload) => (await api.post("/api/services", payload)).data;
export const updateService = async (id, payload) => (await api.put(`/api/services/${id}`, payload)).data;
export const deleteService = async (id) => (await api.delete(`/api/services/${id}`)).data;

export default api;
