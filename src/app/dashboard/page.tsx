import Sidebar from "@/components/dashboard/sidebar";
import DashboardContent from "@/components/dashboard/dashboard-content";
import ProtectedRoute from "@/components/auth/protected-route";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="lg:ml-52 pb-20 lg:pb-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <DashboardContent />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
