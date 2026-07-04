"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";

export type BillingCurrency = "INR" | "USD";

export type PremiumProduct = {
  id: string;
  slug: string;
  title: string;
  description: string;
  kind: "full_pro" | "track";
  trackKey: string;
  active: boolean;
  freeItemQuota: number;
  displayOrder: number;
  metadata: Record<string, unknown>;
  prices: {
    INR: number;
    USD: number;
  };
  selectedCurrency: BillingCurrency;
  selectedAmount: number;
  unlocked: boolean;
};

export type PremiumAccess = {
  isPro: boolean;
  tracks: string[];
};

export function formatPremiumAmount(amount: number, currency: BillingCurrency) {
  const major = amount / 100;
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "INR" ? 0 : 2,
  }).format(major);
}

export function useEntitlements(currency: BillingCurrency = "INR") {
  const [access, setAccess] = useState<PremiumAccess>({ isPro: false, tracks: [] });
  const [products, setProducts] = useState<PremiumProduct[]>([]);
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/v1/billing/products", {
        params: { currency },
      });
      const data = response.data?.data;
      setAccess(data?.access || { isPro: false, tracks: [] });
      setProducts(data?.products || []);
      setRazorpayKeyId(data?.razorpayKeyId || "");
    } catch {
      setAccess({ isPro: false, tracks: [] });
      setProducts([]);
      setRazorpayKeyId("");
    } finally {
      setLoading(false);
    }
  }, [currency]);

  const applyAccess = useCallback((nextAccess: PremiumAccess) => {
    setAccess(nextAccess);
    setProducts((prev) =>
      prev.map((product) => ({
        ...product,
        unlocked:
          product.kind === "full_pro"
            ? nextAccess.isPro
            : nextAccess.isPro || nextAccess.tracks.includes(product.trackKey),
      })),
    );
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handlePremiumChange = () => {
      void refresh();
    };

    window.addEventListener("premiumAccessChanged", handlePremiumChange);
    window.addEventListener("storage", handlePremiumChange);
    return () => {
      window.removeEventListener("premiumAccessChanged", handlePremiumChange);
      window.removeEventListener("storage", handlePremiumChange);
    };
  }, [refresh]);

  const hasTrack = useCallback(
    (trackKey: string) => access.isPro || access.tracks.includes(trackKey),
    [access],
  );

  const productForTrack = useCallback(
    (trackKey: string) => products.find((product) => product.trackKey === trackKey),
    [products],
  );

  return {
    access,
    products,
    razorpayKeyId,
    loading,
    refresh,
    applyAccess,
    hasTrack,
    productForTrack,
  };
}
