"use client";

/**
 * FeatureGate
 * Shows a "disabled" message when the given platform setting is off.
 *
 * Usage:
 *   <FeatureGate settingKey="incidents_enabled" featureName="Incident Simulations">
 *     <IncidentsPage />
 *   </FeatureGate>
 */
import React from "react";
import { Lock } from "lucide-react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

interface Props {
  settingKey: string;
  featureName?: string;
  children: React.ReactNode;
}

export function FeatureGate({ settingKey, featureName, children }: Props) {
  const { isEnabled, loading } = usePlatformSettings();

  if (loading) return null;

  if (!isEnabled(settingKey)) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gray-200 dark:border-white/10">
          <Lock className="h-6 w-6 text-gray-400 dark:text-gray-500" />
        </div>
        <div>
          <p className="font-mono text-base font-semibold text-black dark:text-white">
            {featureName ?? "This Feature"} is Disabled
          </p>
          <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">
            The platform admin has temporarily turned off this feature.
            <br />
            Please check back later or contact support.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
