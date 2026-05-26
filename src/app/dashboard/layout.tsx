"use client";

import Sidebar from "@/components/dashboard/sidebar";
import ProtectedRoute from "@/components/auth/protected-route";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pinned, setPinned] = useState(false);
  const pathname = usePathname();
  const isCollabRoom = Boolean(pathname?.match(/^\/dashboard\/collab\/[^/]+/));
  const isIncidentWorkspace = Boolean(
    pathname?.match(/^\/dashboard\/incidents\/[^/]+/),
  );
  const isFullscreenWorkspace = isCollabRoom || isIncidentWorkspace;

  return (
    <ProtectedRoute>
      <div className="relative h-dvh overflow-hidden bg-white text-black dark:bg-black dark:text-white">
        <Sidebar pinned={pinned} onTogglePin={() => setPinned((p) => !p)} />
        <main
          style={{ marginLeft: pinned ? 220 : 72 }}
          className={`relative z-10 h-full min-h-0 w-full min-w-0 max-w-full overflow-x-hidden border-l border-black/20 pr-6 dark:border-white/20 sm:pr-8 lg:pr-12 transition-[margin] duration-300 ease-in-out ${
            isFullscreenWorkspace
              ? "overflow-hidden pb-0"
              : "overflow-y-auto overflow-x-hidden pb-20 lg:pb-0"
          }`}
        >
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
