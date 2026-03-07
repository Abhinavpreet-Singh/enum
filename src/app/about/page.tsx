import Header from "@/components/header";
import Footer from "@/components/footer";

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-5xl mx-auto px-4 md:px-6 pt-28 pb-16 font-sans">
        <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-black dark:text-white mb-6">
          About Enum
        </h1>

        <p className="text-base md:text-lg text-gray-700 dark:text-gray-300 mb-10 leading-relaxed">
          Enum is a hands-on learning platform designed to close the gap between algorithmic puzzles and real-world software
          engineering challenges. We help developers build confidence by practicing production-like scenarios in a safe,
          guided environment.
        </p>

        <section className="space-y-10">
          <div>
            <h2 className="text-2xl font-display font-semibold tracking-tight text-black dark:text-white mb-3">
              Our Vision
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Learning happens fastest when you can iterate quickly, see real results, and get feedback. Enum provides the
              tooling, context, and community so you can focus on deep practice without getting blocked by setup or noise.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-display font-semibold tracking-tight text-black dark:text-white mb-3">
              What Makes Us Different
            </h2>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 leading-relaxed">
              <li>Realistic simulations built from real production systems and common failure modes</li>
              <li>Clear goals, scoring, and progress tracking so you can measure improvement</li>
              <li>Built-in hints, explanations, and guided paths for learning at your own pace</li>
              <li>Rankings, team play, and community events to keep you motivated</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-display font-semibold tracking-tight text-black dark:text-white mb-3">
              How It Works
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Choose a simulation, jump into the workspace, and start solving. Each scenario provides a realistic environment
              with tools, hints, and a scoring system. As you progress, you unlock new challenges, refine your approach, and
              earn rankings.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-display font-semibold tracking-tight text-black dark:text-white mb-3">
              Join the Community
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              Whether you're a beginner looking to learn or an experienced engineer sharpening your skills, Enum is built for you.
              Start by creating an account, exploring a simulation, and connecting with others in the community.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
