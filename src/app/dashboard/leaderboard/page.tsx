import Sidebar from "@/components/dashboard/sidebar";

export default function LeaderboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <main className="lg:ml-52 pb-20 lg:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-black mb-4">Leaderboard</h1>
          <p className="text-gray-600">Coming soon...</p>
        </div>
      </main>
    </div>
  );
}
