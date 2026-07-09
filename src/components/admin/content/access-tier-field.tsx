"use client";

import { labelCls } from "./admin-form-styles";

type AccessTier = "free" | "paid";

export function AccessTierField({
  value,
  onChange,
}: {
  value: AccessTier;
  onChange: (value: AccessTier) => void;
}) {
  return (
    <div>
      <label className={labelCls}>Access tier</label>
      <div className="flex gap-2">
        {(["free", "paid"] as const).map((tier) => (
          <button
            key={tier}
            type="button"
            onClick={() => onChange(tier)}
            className={`px-4 py-2 font-mono text-[10px] uppercase tracking-wider border transition-colors ${
              value === tier
                ? tier === "free"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                  : "border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                : "border-black/20 text-gray-500 hover:border-black dark:border-white/25 dark:text-gray-400 dark:hover:border-white"
            }`}
          >
            {tier}
          </button>
        ))}
      </div>
      <p className="mt-1.5 font-mono text-[10px] text-gray-400">
        Free content is available without a premium subscription. Paid content requires track access.
      </p>
    </div>
  );
}

export function accessTierToIsFree(tier: AccessTier): boolean {
  return tier === "free";
}
