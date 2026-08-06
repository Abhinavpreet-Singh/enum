/**
 * Shared authenticated Axios instance.
 *
 * - Injects the in-memory access token as a Bearer header on every request.
 * - On 401, refreshes the token once via POST /api/v1/auth/refresh (with the
 *   HttpOnly refresh cookie) and retries the original request.
 * - Queues concurrent 401 requests so only one refresh call is made.
 */
import axios, { AxiosError, isAxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/lib/api-config";
import { getMemoryToken, setMemoryToken, clearMemoryToken } from "@/lib/tokenStore";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Bare client for refresh — must NOT use the main `api` instance or its
// response interceptor will deadlock when refresh itself returns 401.
const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

function isRefreshRequest(config?: InternalAxiosRequestConfig) {
  const url = config?.url ?? "";
  return url.includes("/api/v1/auth/refresh");
}

// ─── Refresh queue ────────────────────────────────────────────────────────────

type Resolver = (token: string | null) => void;
let isRefreshing = false;
let refreshQueue: Resolver[] = [];

function resolveQueue(token: string | null) {
  refreshQueue.forEach((resolve) => resolve(token));
  refreshQueue = [];
}

async function doRefresh(): Promise<string | null> {
  try {
    const res = await refreshClient.post("/api/v1/auth/refresh", {});
    const newToken: string = res.data?.accessToken;
    setMemoryToken(newToken);
    return newToken;
  } catch {
    clearMemoryToken();
    return null;
  }
}

// ─── Request interceptor ──────────────────────────────────────────────────────

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getMemoryToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response interceptor ─────────────────────────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retried?: boolean;
    };

    if (
      error.response?.status !== 401 ||
      originalRequest._retried ||
      isRefreshRequest(originalRequest)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retried = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((token) => {
          if (!token) return reject(error);
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(api(originalRequest));
        });
      });
    }

    isRefreshing = true;
    const newToken = await doRefresh();
    isRefreshing = false;
    resolveQueue(newToken);

    if (!newToken) return Promise.reject(error);

    originalRequest.headers.Authorization = `Bearer ${newToken}`;
    return api(originalRequest);
  },
);

export default api;
export { isAxiosError };
