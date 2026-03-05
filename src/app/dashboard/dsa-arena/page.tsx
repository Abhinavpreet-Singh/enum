import QuestionsList from "@/components/dsa/questions-list";

export default function DSAArenaPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2">DSA Arena</h1>
        <p className="text-gray-600 font-mono text-xs tracking-wider">
          Practice classic data structure and algorithm problems
        </p>
      </div>

      <QuestionsList />
    </div>
  );
}
