"use client";

import { useEffect } from "react";
import { setupAxiosInterceptors } from "@/lib/axios";

/**
 * Registers global Axios interceptors once on the client side.
 *
 * Place this inside the root layout so the interceptors are active
 * before any component fires an API request.
 */
export function AxiosProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    setupAxiosInterceptors();
  }, []);

  return <>{children}</>;
}
