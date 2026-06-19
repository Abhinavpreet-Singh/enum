/**
 * Shared authenticated Axios instance.
 *
 * - Injects the in-memory access token as a Bearer header on every request.
 * - On 401, refreshes the token once via POST /api/v1/auth/refresh (with the
 *   HttpOnly refresh cookie) and retries the original request.
 * - Queues concurrent 401 requests so only one refresh call is made.
 */
import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { proxy } from "@/app/proxy";
import { getMemoryToken, setMemoryToken, clearMemoryToken } from "@/lib/tokenStore";

const api = axios.create({
  baseURL: proxy as string,
  withCredentials: true,
});

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
    const res = await axios.post(
      `${proxy}/api/v1/auth/refresh`,
      {},
      { withCredentials: true },
    );
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

    if (error.response?.status !== 401 || originalRequest._retried) {
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
