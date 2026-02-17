import Sidebar from "@/components/dashboard/sidebar";
import QuestionForm from "@/components/admin/question-form";
import ProtectedRoute from "@/components/auth/protected-route";

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="lg:ml-52 pb-20 lg:pb-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-black mb-2">
                Admin Panel
              </h1>
              <p className="font-mono text-sm text-gray-600 tracking-wide">
                POST NEW DSA QUESTIONS
              </p>
            </div>

            <QuestionForm />
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
