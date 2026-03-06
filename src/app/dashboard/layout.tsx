"use client";

import Sidebar from "@/components/dashboard/sidebar";
import ProtectedRoute from "@/components/auth/protected-route";
import { useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pinned, setPinned] = useState(false);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-black">
        <Sidebar pinned={pinned} onTogglePin={() => setPinned((p) => !p)} />
        <main
          style={{ zoom: "110%" }}
          className={`${
            pinned ? "lg:ml-62" : "lg:ml-18"
          } pb-20 lg:pb-0 transition-[margin] duration-300 ease-in-out`}
        >
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
