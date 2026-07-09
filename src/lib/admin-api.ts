import { getMemoryToken } from "@/lib/tokenStore";

export function getAdminRequestConfig() {
  const token = typeof window !== "undefined" ? getMemoryToken() : null;
  return {
    withCredentials: true as const,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  };
}
