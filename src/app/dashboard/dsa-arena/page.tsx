import QuestionsList from "@/components/dsa/questions-list";

export default function DSAArenaPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <p className="font-mono text-[10px] tracking-[0.3em] text-gray-400 uppercase mb-1">
            Dashboard / DSA Arena
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-black dark:text-white tracking-tight">
            DSA Arena
          </h1>
          <p className="font-mono text-xs text-gray-500 dark:text-gray-400 mt-1">
            Practice data structures &amp; algorithms — LeetCode style
          </p>
        </div>
        <QuestionsList />
      </div>
    </div>
  );
}
