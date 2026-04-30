import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

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

    const sessionStr = localStorage.getItem("session");
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

export default api;
