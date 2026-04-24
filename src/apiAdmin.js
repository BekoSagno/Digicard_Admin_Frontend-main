import axios from "axios";
import Cookies from "js-cookie";

const backendUrl = import.meta.env.VITE_APP_URL_BACKEND || "http://localhost:8000";

export const adminApiClient = axios.create({
  baseURL: backendUrl,
  withCredentials: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
  timeout: 15000,
});

adminApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApiClient.interceptors.request.use((config) => {
  const xsrfToken = Cookies.get("XSRF-TOKEN");
  if (xsrfToken) {
    config.headers = config.headers || {};
    config.headers["X-XSRF-TOKEN"] = decodeURIComponent(xsrfToken);
  }
  return config;
});

export default adminApiClient;

