"use client";

import { useEffect, useState } from "react";
import { Check, Crown, Loader2, RefreshCcw, ShieldCheck, X } from "lucide-react";
import api from "@/lib/api";

type Product = {
  id: string;
  slug: string;
  title: string;
  description: string;
  kind: "full_pro" | "track";
  trackKey: string;
  active: boolean;
  priceInrPaise: number;
  priceUsdCents: number;
  freeItemQuota: number;
  displayOrder: number;
};

type Order = {
  id: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  currency: string;
  amount: number;
  status: string;
  createdAt: string;
  product?: { title: string; slug: string };
  user?: { username: string; email: string; displayName?: string };
};

type Entitlement = {
  id: string;
  scope: string;
  trackKey: string;
  source: string;
  createdAt: string;
  product?: { title: string; slug: string };
  user?: { id: string; username: string; email: string; displayName?: string };
};

const panelBorder = "border border-black/20 dark:border-white/25";
const panelSurface = `${panelBorder} bg-white/80 dark:bg-black/75`;
const labelCls = "font-mono text-[10px] uppercase tracking-widest text-gray-400";

const formatMinor = (amount: number, currency: string) =>
  new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "INR" ? 0 : 2,
  }).format((amount || 0) / 100);

export default function BillingSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");
  const [grantUserId, setGrantUserId] = useState("");
  const [grantProductId, setGrantProductId] = useState("");

  const fetchBilling = async () => {
    setLoading(true);
    try {
      const response = await api.get("/api/v1/admin/billing");
      const data = response.data?.data;
      setProducts(data?.products || []);
      setOrders(data?.orders || []);
      setEntitlements(data?.entitlements || []);
      setGrantProductId((current) => current || data?.products?.[0]?.id || "");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchBilling();
  }, []);

  const patchProduct = async (product: Product, patch: Partial<Product>) => {
    setSaving(product.id);
    setMessage("");
    try {
      const response = await api.patch(`/api/v1/admin/billing/products/${product.id}`, patch);
      setProducts((prev) =>
        prev.map((entry) => (entry.id === product.id ? response.data.data : entry)),
      );
      setMessage("Product updated.");
    } finally {
      setSaving("");
    }
  };

  const grantAccess = async () => {
    if (!grantUserId.trim() || !grantProductId) {
      setMessage("Enter a user id and choose a product.");
      return;
    }
    setSaving("grant");
    try {
      await api.post("/api/v1/admin/billing/entitlements", {
        userId: grantUserId.trim(),
        productId: grantProductId,
        notes: "Granted from admin billing panel",
      });
      setGrantUserId("");
      setMessage("Entitlement granted.");
      await fetchBilling();
    } finally {
      setSaving("");
    }
  };

  const revokeAccess = async (id: string) => {
    setSaving(id);
    try {
      await api.patch(`/api/v1/admin/billing/entitlements/${id}/revoke`);
      setEntitlements((prev) => prev.filter((entry) => entry.id !== id));
      setMessage("Entitlement revoked.");
    } finally {
      setSaving("");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        <span className="font-mono text-sm">Loading billing controls...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className={labelCls}>Premium Products</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Control prices, free quotas, and active premium tracks.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchBilling()}
          className="inline-flex items-center gap-2 border border-gray-200 px-3 py-2 font-mono text-xs uppercase tracking-widest text-gray-500 hover:text-black dark:border-white/10 dark:hover:text-white"
        >
          <RefreshCcw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {message && (
        <div className={`${panelSurface} px-4 py-3 font-mono text-xs text-gray-500`}>
          {message}
        </div>
      )}

      <div className="grid gap-3 xl:grid-cols-2">
        {products.map((product) => (
          <div key={product.id} className={`${panelSurface} p-4`}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-mono text-xs font-semibold text-black dark:text-white">
                  <Crown className="h-3.5 w-3.5 text-amber-500" />
                  {product.title}
                </p>
                <p className="mt-1 font-mono text-[10px] text-gray-400">{product.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => void patchProduct(product, { active: !product.active })}
                className={`inline-flex items-center gap-1 border px-2 py-1 font-mono text-[10px] uppercase tracking-widest ${
                  product.active
                    ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                    : "border-gray-200 text-gray-400 dark:border-white/10"
                }`}
              >
                {product.active ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                {product.active ? "Active" : "Inactive"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                ["priceInrPaise", "INR Paise"],
                ["priceUsdCents", "USD Cents"],
                ["freeItemQuota", "Free Items"],
                ["displayOrder", "Order"],
              ].map(([key, label]) => (
                <label key={key} className="space-y-1">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-gray-400">
                    {label}
                  </span>
                  <input
                    type="number"
                    value={product[key as keyof Product] as number}
                    onChange={(event) => {
                      const value = Math.max(0, Number(event.target.value) || 0);
                      setProducts((prev) =>
                        prev.map((entry) =>
                          entry.id === product.id ? { ...entry, [key]: value } : entry,
                        ),
                      );
                    }}
                    onBlur={(event) =>
                      void patchProduct(product, {
                        [key]: Math.max(0, Number(event.target.value) || 0),
                      } as Partial<Product>)
                    }
                    className="w-full border border-gray-200 bg-transparent px-2 py-1.5 font-mono text-xs text-black outline-none focus:border-black dark:border-white/10 dark:text-white dark:focus:border-white"
                  />
                </label>
              ))}
            </div>
            {saving === product.id && (
              <p className="mt-2 font-mono text-[10px] text-gray-400">Saving...</p>
            )}
          </div>
        ))}
      </div>

      <div className={`${panelSurface} p-4`}>
        <p className={`${labelCls} mb-3 flex items-center gap-2`}>
          <ShieldCheck className="h-3.5 w-3.5" /> Manual Grant
        </p>
        <div className="grid gap-3 md:grid-cols-[1fr_260px_auto]">
          <input
            value={grantUserId}
            onChange={(event) => setGrantUserId(event.target.value)}
            placeholder="User id"
            className="border border-gray-200 bg-transparent px-3 py-2 font-mono text-xs text-black outline-none focus:border-black dark:border-white/10 dark:text-white dark:focus:border-white"
          />
          <select
            value={grantProductId}
            onChange={(event) => setGrantProductId(event.target.value)}
            className="border border-gray-200 bg-transparent px-3 py-2 font-mono text-xs text-black outline-none focus:border-black dark:border-white/10 dark:text-white dark:focus:border-white"
          >
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={saving === "grant"}
            onClick={() => void grantAccess()}
            className="border border-black bg-black px-4 py-2 font-mono text-xs uppercase tracking-widest text-white disabled:opacity-50 dark:border-white dark:bg-white dark:text-black"
          >
            Grant
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className={`${panelSurface} overflow-hidden`}>
          <div className="border-b border-black/5 px-4 py-3 dark:border-white/5">
            <p className={labelCls}>Active Entitlements</p>
          </div>
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {entitlements.slice(0, 12).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-black dark:text-white">
                    {entry.user?.displayName || entry.user?.username || entry.user?.email}
                  </p>
                  <p className="font-mono text-[10px] text-gray-400">
                    {entry.product?.title || entry.trackKey || entry.scope} · {entry.source}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void revokeAccess(entry.id)}
                  disabled={saving === entry.id}
                  className="shrink-0 border border-red-500/40 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-red-500 disabled:opacity-50"
                >
                  Revoke
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className={`${panelSurface} overflow-hidden`}>
          <div className="border-b border-black/5 px-4 py-3 dark:border-white/5">
            <p className={labelCls}>Recent Orders</p>
          </div>
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {orders.slice(0, 12).map((order) => (
              <div key={order.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs text-black dark:text-white">
                    {order.product?.title || order.razorpayOrderId}
                  </p>
                  <p className="font-mono text-[10px] text-gray-400">
                    {order.user?.email || "Unknown user"} · {order.status}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-xs text-gray-500">
                  {formatMinor(order.amount, order.currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
