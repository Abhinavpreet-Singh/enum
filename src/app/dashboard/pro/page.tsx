"use client";

import { useState } from "react";
import { Check, Crown, Loader2, Lock, Sparkles, WalletCards } from "lucide-react";
import {
  DashboardPageHeader,
  DashboardPageShell,
} from "@/components/dashboard/dashboard-page-shell";
import api from "@/lib/api";
import {
  type BillingCurrency,
  type PremiumProduct,
  formatPremiumAmount,
  useEntitlements,
} from "@/hooks/useEntitlements";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: BillingCurrency;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; email?: string };
  theme?: { color: string };
  handler: (response: RazorpayResponse) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

const loadRazorpay = () =>
  new Promise<boolean>((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const TRACK_LABELS: Record<string, string> = {
  "system-design": "System Design",
  frontend: "Frontend",
  backend: "Backend",
  "soa-os": "SOA & OS",
  dsa: "DSA",
  linux: "Linux",
};

function ProductCard({
  product,
  currency,
  buying,
  onBuy,
}: {
  product: PremiumProduct;
  currency: BillingCurrency;
  buying: boolean;
  onBuy: (product: PremiumProduct) => void;
}) {
  const isFullPro = product.kind === "full_pro";

  return (
    <div
      className={`relative flex flex-col border bg-white p-5 dark:bg-[#111] ${
        isFullPro
          ? "border-black shadow-sm dark:border-white"
          : "border-gray-100 dark:border-white/8"
      }`}
    >
      {product.unlocked && (
        <span className="absolute right-4 top-4 inline-flex items-center gap-1 border border-emerald-500/30 bg-emerald-50 px-2 py-1 font-mono text-[9px] uppercase tracking-widest text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400">
          <Check className="h-3 w-3" /> Unlocked
        </span>
      )}

      <div className="mb-5 flex h-10 w-10 items-center justify-center border border-gray-200 text-black dark:border-white/10 dark:text-white">
        {isFullPro ? <Crown className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-gray-400">
        {isFullPro ? "Full Access" : TRACK_LABELS[product.trackKey] || "Track"}
      </p>
      <h2 className="mt-1 text-xl font-bold text-black dark:text-white">{product.title}</h2>
      <p className="mt-2 min-h-12 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
        {product.description}
      </p>

      <div className="my-5 border-t border-gray-100 pt-5 dark:border-white/8">
        <span className="text-3xl font-bold text-black dark:text-white">
          {formatPremiumAmount(product.selectedAmount, currency)}
        </span>
        <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-gray-400">
          lifetime
        </span>
      </div>

      <div className="mb-5 space-y-2 text-xs text-gray-500 dark:text-gray-400">
        <p className="flex items-center gap-2">
          <Check className="h-3.5 w-3.5 text-emerald-500" />
          {isFullPro ? "Unlock all premium tracks" : `Unlock ${TRACK_LABELS[product.trackKey] || product.title}`}
        </p>
        <p className="flex items-center gap-2">
          <Check className="h-3.5 w-3.5 text-emerald-500" />
          First {product.freeItemQuota || 0} items stay free for everyone
        </p>
      </div>

      <button
        type="button"
        disabled={buying || product.unlocked || product.selectedAmount <= 0}
        onClick={() => onBuy(product)}
        className={`mt-auto inline-flex items-center justify-center gap-2 border px-4 py-3 font-mono text-xs uppercase tracking-widest transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
          isFullPro
            ? "border-black bg-black text-white hover:bg-gray-800 dark:border-white dark:bg-white dark:text-black"
            : "border-gray-200 text-black hover:border-black dark:border-white/10 dark:text-white dark:hover:border-white"
        }`}
      >
        {buying ? <Loader2 className="h-4 w-4 animate-spin" /> : <WalletCards className="h-4 w-4" />}
        {product.unlocked ? "Already Unlocked" : "Checkout"}
      </button>
    </div>
  );
}

export default function ProPage() {
  const [currency, setCurrency] = useState<BillingCurrency>("INR");
  const [buyingSlug, setBuyingSlug] = useState("");
  const [message, setMessage] = useState("");
  const { access, products, loading, refresh } = useEntitlements(currency);

  const buyProduct = async (product: PremiumProduct) => {
    setMessage("");
    setBuyingSlug(product.slug);
    try {
      const loaded = await loadRazorpay();
      if (!loaded || !window.Razorpay) {
        setMessage("Unable to load Razorpay checkout. Please try again.");
        return;
      }

      const orderResponse = await api.post("/api/v1/billing/orders", {
        productSlug: product.slug,
        currency,
      });
      const order = orderResponse.data?.data;

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Enum",
        description: product.title,
        order_id: order.orderId,
        prefill: order.user,
        theme: { color: "#000000" },
        handler: async (response) => {
          await api.post("/api/v1/billing/verify", response);
          setMessage("Payment verified. Premium access is unlocked.");
          await refresh();
        },
      });

      checkout.open();
    } catch (error) {
      const fallback = "Checkout failed. Please try again.";
      setMessage(
        typeof error === "object" &&
          error !== null &&
          "response" in error &&
          typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (error as { response: { data: { message: string } } }).response.data.message
          : fallback,
      );
    } finally {
      setBuyingSlug("");
    }
  };

  return (
    <DashboardPageShell className="space-y-6">
      <DashboardPageHeader
        breadcrumb="Dashboard / Pro"
        title="Upgrade To Enum Pro"
        description="Buy lifetime access to premium tracks with secure Razorpay checkout."
      />

      <div className="flex flex-col gap-3 border border-gray-100 bg-white p-4 dark:border-white/8 dark:bg-[#111] md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center border border-gray-200 dark:border-white/10">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
              Current access
            </p>
            <p className="text-sm font-semibold text-black dark:text-white">
              {access.isPro
                ? "Full Pro active"
                : access.tracks.length
                  ? `${access.tracks.length} premium track unlocked`
                  : "Free plan"}
            </p>
          </div>
        </div>
        <div className="flex w-fit border border-gray-200 dark:border-white/10">
          {(["INR", "USD"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCurrency(option)}
              className={`px-4 py-2 font-mono text-xs uppercase tracking-widest ${
                currency === option
                  ? "bg-black text-white dark:bg-white dark:text-black"
                  : "text-gray-500 hover:text-black dark:hover:text-white"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div className="border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-xs text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          <span className="font-mono text-sm">Loading plans...</span>
        </div>
      ) : (
        <div className="grid gap-px bg-gray-100 dark:bg-white/5 md:grid-cols-2 xl:grid-cols-4">
          {products
            .filter((product) => product.active)
            .map((product) => (
              <ProductCard
                key={product.slug}
                product={product}
                currency={currency}
                buying={buyingSlug === product.slug}
                onBuy={buyProduct}
              />
            ))}
        </div>
      )}
    </DashboardPageShell>
  );
}
