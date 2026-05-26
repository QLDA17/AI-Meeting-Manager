import axios from "axios";

const browserOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
const baseURL = import.meta.env.VITE_API_BASE_URL || browserOrigin;

const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add the auth token to headers
api.interceptors.request.use(
  (config) => {
    const normalizedBase = (config.baseURL || "").replace(/\/+$/, "");
    const hasApiSuffix = /\/api$/i.test(normalizedBase);
    if (hasApiSuffix && typeof config.url === "string" && config.url.startsWith("/api/")) {
      config.url = config.url.replace(/^\/api/, "");
    }

    const sessionStr = typeof localStorage !== "undefined" ? localStorage.getItem("session") : null;
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        if (session.token) {
          config.headers.Authorization = `Bearer ${session.token}`;
        }
      } catch (e) {
        console.error("Failed to parse session from localStorage", e);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error?.response?.status === 403 &&
      error?.response?.data?.detail === "Account is deactivated" &&
      typeof window !== "undefined"
    ) {
      localStorage.removeItem("user");
      localStorage.removeItem("session");
      localStorage.removeItem("auth-storage");
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      const url = String(error.config?.url || "");
      const isAuthAttempt = url.includes("/api/auth/login") || url.includes("/auth/login");
      if (!isAuthAttempt) {
        localStorage.removeItem("user");
        localStorage.removeItem("session");
        localStorage.removeItem("auth-storage");
        if (window.location.pathname !== "/login") {
          window.location.assign("/login");
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
