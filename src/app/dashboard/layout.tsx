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
  const isCollabRoute = pathname?.startsWith("/dashboard/collab") ?? false;

  return (
    <ProtectedRoute>
      <div className="h-dvh overflow-hidden bg-white text-black dark:bg-black dark:text-white">
        <Sidebar pinned={pinned} onTogglePin={() => setPinned((p) => !p)} />
        <main
          style={{ zoom: isCollabRoute ? "100%" : "110%" }}
          className={`${
            pinned ? "lg:ml-62" : "lg:ml-18"
          } h-full min-h-0 transition-[margin] duration-300 ease-in-out ${
            isCollabRoute
              ? "overflow-hidden pb-0"
              : "overflow-y-auto pb-20 lg:pb-0"
          }`}
        >
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
