"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import useAuth from "@/hooks/useAuth";
import { fetchQuestions, Question } from "@/data/dsa-questions";

const difficultyColors = {
  Easy: "text-black",
  Medium: "text-black",
  Hard: "text-black",
};

export default function LatestIncidentsSection() {
  const isAuthenticated = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuestions = async () => {
      setLoading(true);
      const qs = await fetchQuestions();
      setQuestions(qs);
      setLoading(false);
    };

    loadQuestions();
  }, []);

  const topQuestions = useMemo(() => questions.slice(0, 3), [questions]);
  const viewAllHref = isAuthenticated ? "/dashboard/simulations" : "/login";

  return (
    <section id="simulations" className="py-16 md:py-20 px-4 md:px-6 bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="mb-8 md:mb-12">
          <h2 className="font-mono text-2xl md:text-4xl font-bold mb-3 md:mb-4 text-black dark:text-white tracking-tight">
            Latest Incidents
          </h2>
          <p className="text-gray-700 dark:text-gray-400 text-xs md:text-sm font-mono tracking-[0.05em]">
            These are the latest questions on your dashboard. Click one to jump in.
          </p>
        </div>

        {/* Question cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-16">
              <div className="font-mono text-sm text-gray-500">Loading questions...</div>
            </div>
          ) : topQuestions.length === 0 ? (
            <div className="col-span-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black p-8 text-center">
              <p className="text-gray-700 dark:text-gray-300">No questions found yet.</p>
            </div>
          ) : (
            topQuestions.map((question) => {
              const href = isAuthenticated ? `/dashboard/dsa-arena/${question.id}` : "/login";

              return (
                <Link
                  key={question.id}
                  href={href}
                  className="group bg-white dark:bg-black border border-gray-200 dark:border-transparent p-4 md:p-6 rounded-lg hover:border-black dark:hover:border-white transition-all"
                >
                  {/* Track badge (category) */}
                  <div className="flex items-center justify-between mb-3 md:mb-4 gap-2 flex-wrap">
                    <span className="inline-flex items-center px-2 md:px-3 py-1 rounded-full text-xs font-mono font-semibold border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-transparent text-black dark:text-gray-300">
                      {question.category || "DSA"}
                    </span>
                    <span className="flex items-center text-xs text-gray-500 dark:text-gray-500 font-mono whitespace-nowrap">
                      <svg
                        className="w-4 h-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      {question.difficulty}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg md:text-xl font-bold mb-2 md:mb-3 text-black dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors">
                    {question.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-700 dark:text-gray-400 text-sm leading-relaxed mb-3 md:mb-4 line-clamp-3">
                    {question.description}
                  </p>

                  {/* Footer - difficulty and arrow */}
                  <div className="flex items-center justify-between pt-3 md:pt-4 border-t border-gray-200 dark:border-transparent">
                    <div>
                      <span className="text-xs text-gray-600 dark:text-gray-500">
                        Difficulty: {" "}
                      </span>
                      <span
                        className={`text-xs font-semibold ${difficultyColors[question.difficulty]}`}
                      >
                        {question.difficulty}
                      </span>
                    </div>
                    <svg
                      className="w-4 md:w-5 h-4 md:h-5 text-gray-400 dark:text-gray-600 group-hover:text-black dark:group-hover:text-white group-hover:translate-x-1 transition-all"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* View all link */}
        <div className="text-center mt-8 md:mt-12">
          <Link
            href={viewAllHref}
            className="inline-flex items-center text-sm font-medium text-gray-700 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
          >
            View all questions
            <svg
              className="w-4 h-4 ml-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
