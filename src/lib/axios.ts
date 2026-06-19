import axios from "axios";
import { proxy } from "@/app/proxy";
import { getMemoryToken, setMemoryToken, clearMemoryToken } from "@/lib/tokenStore";

/**
 * Global Axios interceptors for the legacy `axios` instance.
 *
 * - Reads the access token from the in-memory store (not localStorage).
 * - Automatically refreshes via POST /api/v1/auth/refresh on 401.
 * - Retries the original request once with the new token.
 */

let interceptorRegistered = false;
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function resolveQueue(token: string | null) {
  refreshQueue.forEach((fn) => fn(token));
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
    if (newToken) setMemoryToken(newToken);
    return newToken || null;
  } catch {
    clearMemoryToken();
    return null;
  }
}

export function setupAxiosInterceptors() {
  if (interceptorRegistered) return;
  interceptorRegistered = true;

  // ── Request: inject in-memory access token ─────────────────────────────
  axios.interceptors.request.use(
    (config) => {
      config.withCredentials = true;

      if (!config.headers.Authorization) {
        const token = getMemoryToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }

      return config;
    },
    (error) => Promise.reject(error),
  );

  // ── Response: refresh on 401 and retry once ────────────────────────────
  axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as typeof error.config & {
        _retried?: boolean;
      };

      if (error?.response?.status !== 401 || originalRequest?._retried) {
        return Promise.reject(error);
      }

      originalRequest._retried = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshQueue.push((token) => {
            if (!token) return reject(error);
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(axios(originalRequest));
          });
        });
      }

      isRefreshing = true;
      const newToken = await doRefresh();
      isRefreshing = false;
      resolveQueue(newToken);

      if (!newToken) return Promise.reject(error);

      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      return axios(originalRequest);
    },
  );
}
