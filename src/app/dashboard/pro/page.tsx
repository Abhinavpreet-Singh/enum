"use client";

import { useState } from "react";
import { Check, Crown, Loader2, Lock, Sparkles, WalletCards, ArrowRight } from "lucide-react";
import Link from "next/link";
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
  modal?: { ondismiss?: () => void };
  handler: (response: RazorpayResponse) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on?: (event: "payment.failed", callback: (response: unknown) => void) => void;
    };
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
  const unlockedLabel = isFullPro
    ? "You already have Enum Pro"
    : "You already got this pack";

  return (
    <div
      className={`relative flex flex-col border bg-white p-5 dark:bg-[#111] ${
        isFullPro
          ? "border-black shadow-sm dark:border-white"
          : "border-gray-100 dark:border-white/8"
      }`}
    >
      <span
        className={`absolute right-4 top-4 inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[9px] uppercase tracking-widest ${
          product.unlocked
            ? "border-emerald-500/30 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400"
            : "border-gray-200 bg-white text-gray-400 dark:border-white/10 dark:bg-black"
        }`}
      >
        {product.unlocked ? (
          <>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Ongoing
          </>
        ) : (
          "Lifetime"
        )}
      </span>

      <div className="mb-5 flex h-10 w-10 items-center justify-center border border-gray-200 text-black dark:border-white/10 dark:text-white">
        {isFullPro ? <Crown className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
      </div>

      <div className="mb-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-gray-400">
          {isFullPro ? "Full Access" : TRACK_LABELS[product.trackKey] || "Track"}
        </p>
        <h3 className="text-lg font-bold text-black dark:text-white">
          {product.title}
        </h3>
      </div>

      <p className="mb-5 flex-1 text-xs text-gray-500 dark:text-gray-400">
        {product.description}
      </p>

      <div className="mb-5 border-t border-gray-100 pt-5 dark:border-white/8">
        <span className="text-3xl font-bold text-black dark:text-white">
          {formatPremiumAmount(product.selectedAmount, currency)}
        </span>
        <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-gray-400">
          lifetime
        </span>
      </div>

      <div className="mb-5 space-y-2 text-xs text-gray-500 dark:text-gray-400">
        {product.unlocked && (
          <p className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" />
            {unlockedLabel}
          </p>
        )}
        <p className="flex items-center gap-2">
          <Check className="h-3.5 w-3.5 text-emerald-500" />
          {isFullPro ? "Unlock all premium tracks" : `Unlock ${TRACK_LABELS[product.trackKey] || product.title}`}
        </p>
        <p className="flex items-center gap-2">
          <Check className="h-3.5 w-3.5 text-emerald-500" />
          {isFullPro ? "First 0 items stay free for everyone" : `First ${product.freeItemQuota} items stay free for everyone`}
        </p>
      </div>

      {product.unlocked ? (
        <Link
          href={
            product.kind === "full_pro"
              ? "/dashboard/simulations"
              : product.trackKey === "dsa"
                ? "/dashboard/dsa-arena"
                : "/dashboard/simulations"
          }
          className="flex w-full items-center justify-center gap-2 border border-black bg-black text-white hover:bg-white hover:text-black dark:border-white dark:bg-white dark:text-black dark:hover:bg-black dark:hover:text-white px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-all"
        >
          Study Track <ArrowRight className="h-3.5 w-3.5 shrink-0" />
        </Link>
      ) : (
        <button
          type="button"
          disabled={buying}
          onClick={() => onBuy(product)}
          className="flex w-full items-center justify-center gap-2 border border-black bg-black text-white hover:bg-white hover:text-black dark:border-white dark:bg-white dark:text-black dark:hover:bg-black dark:hover:text-white px-4 py-2 font-mono text-[10px] uppercase tracking-widest transition-all"
        >
          {buying ? <Loader2 className="h-4 w-4 animate-spin" /> : <WalletCards className="h-4 w-4" />}
          Checkout
        </button>
      )}
    </div>
  );
}

export default function ProPage() {
  const [currency, setCurrency] = useState<BillingCurrency>("INR");
  const [buyingSlug, setBuyingSlug] = useState("");
  const [message, setMessage] = useState("");
  const { access, products, loading, refresh } = useEntitlements(currency);

  const announcePremiumChange = async () => {
    await refresh();
    window.dispatchEvent(new Event("premiumAccessChanged"));
    localStorage.setItem("premiumAccessChangedAt", String(Date.now()));
  };

  const buyProduct = async (product: PremiumProduct) => {
    if (product.unlocked) {
      setMessage(
        product.kind === "full_pro"
          ? "You already have Enum Pro."
          : "You already got this pack.",
      );
      return;
    }

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
        modal: {
          ondismiss: () => {
            setMessage("Checkout closed. No payment was captured.");
            setBuyingSlug("");
          },
        },
        handler: async (response) => {
          await api.post("/api/v1/billing/verify", response);
          setMessage("Payment verified. Premium access is unlocked.");
          await announcePremiumChange();
        },
      });

      checkout.on?.("payment.failed", (failure) => {
        const description =
          typeof failure === "object" &&
          failure !== null &&
          "error" in failure &&
          typeof (failure as { error?: { description?: string } }).error?.description === "string"
            ? (failure as { error: { description: string } }).error.description
            : "";
        const isKeyIssue = /key|expired|authentication|credential/i.test(description);
        setMessage(
          isKeyIssue
            ? "Razorpay test key is invalid or expired. Update RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env with a fresh matching test key pair, then restart the backend."
            : description || "Payment failed. Please retry from checkout.",
        );
        setBuyingSlug("");
      });

      checkout.open();
    } catch (error) {
      const fallback = "Checkout failed. Please try again.";
      const backendMessage =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (error as { response: { data: { message: string } } }).response.data.message
          : "";
      setMessage(
        /razorpay|key|expired|authentication|credential/i.test(backendMessage)
          ? `${backendMessage} Check that RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are a fresh matching test key pair in backend/.env.`
          : backendMessage || fallback,
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
                ? "Full Pro Active"
                : access.tracks.length
                  ? `${access.tracks.map((t) => TRACK_LABELS[t] || t).join(" & ")} Track${access.tracks.length > 1 ? "s" : ""} Unlocked`
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
              className={`px-4 py-2 font-mono text-xs uppercase tracking-widest cursor-pointer ${
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
