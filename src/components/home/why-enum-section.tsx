"use client";

const features = [
  "Real codebases, not snippets",
  "Live preview + production logs",
  "Multiple valid solutions accepted",
  "Replay-based evaluation",
  "Job-ready technical training",
];

export default function WhyEnumSection() {
  return (
    <section className="py-16 md:py-20 px-4 md:px-6 bg-white dark:bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-start md:items-center">
          {/* Left side - Text content */}
          <div>
            <h2 className="font-mono text-2xl md:text-4xl font-bold mb-6 md:mb-8 text-black dark:text-white tracking-tight">
              Why engineers train on Enum
            </h2>

            <ul className="space-y-3 md:space-y-4">
              {features.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-start text-gray-800 dark:text-gray-200"
                >
                  <span className="font-mono text-gray-400 dark:text-gray-500 mr-3 mt-1 shrink-0 text-sm">
                    —
                  </span>
                  <span className="text-base md:text-lg">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right side - System Architecture Diagram */}
          <div className="bg-gray-50 dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg p-6 md:p-12 flex items-center justify-center w-full overflow-x-auto">
            <div className="relative w-full max-w-md">
              <div className="text-xs font-mono text-gray-500 dark:text-gray-500 mb-6 md:mb-8 text-center">
                SYSTEM ARCHITECTURE
              </div>

              {/* Desktop layout */}
              <div className="hidden md:flex items-center justify-center space-x-6 md:space-x-8 mb-8">
                {/* Client */}
                <div className="flex flex-col items-center">
                  <div className="w-16 md:w-20 h-16 md:h-20 border-2 border-gray-300 dark:border-white bg-white dark:bg-[#1a1a1a] rounded-lg flex items-center justify-center">
                    <span className="font-mono font-semibold text-xs md:text-sm dark:text-white">
                      CLIENT
                    </span>
                  </div>
                </div>

                {/* Arrow to LB */}
                <div className="flex-1 h-0.5 bg-gray-300 dark:bg-white"></div>

                {/* Load Balancer */}
                <div className="flex flex-col items-center">
                  <div className="w-16 md:w-20 h-16 md:h-20 border-2 border-gray-300 dark:border-white bg-gray-100 dark:bg-[#1a1a1a] rounded-lg flex items-center justify-center">
                    <span className="font-mono font-semibold text-xs md:text-sm text-center leading-tight dark:text-white">
                      LB
                    </span>
                  </div>
                </div>

                {/* Arrow to API */}
                <div className="flex-1 h-0.5 bg-gray-300 dark:bg-white"></div>

                {/* API */}
                <div className="flex flex-col items-center">
                  <div className="w-16 md:w-20 h-16 md:h-20 border-2 border-gray-300 dark:border-white bg-black dark:bg-white rounded-lg flex items-center justify-center">
                    <span className="font-mono font-semibold text-xs md:text-sm text-white dark:text-black">
                      API
                    </span>
                  </div>
                </div>
              </div>

              {/* Vertical line down from LB - Desktop only */}
              <div className="hidden md:block absolute left-1/2 top-28 w-0.5 h-12 bg-gray-300 dark:bg-white -ml-px"></div>

              {/* Mobile layout - vertical stack */}
              <div className="md:hidden flex flex-col items-center gap-3 mb-6">
                {/* Client */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 border-2 border-gray-300 dark:border-white bg-white dark:bg-[#1a1a1a] rounded-lg flex items-center justify-center">
                    <span className="font-mono font-semibold text-xs text-black dark:text-white">
                      CLIENT
                    </span>
                  </div>
                </div>

                <div className="h-3 w-0.5 bg-gray-300 dark:bg-white"></div>

                {/* Load Balancer */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 border-2 border-gray-300 dark:border-white bg-gray-100 dark:bg-[#1a1a1a] rounded-lg flex items-center justify-center">
                    <span className="font-mono font-semibold text-xs text-black dark:text-white">
                      LB
                    </span>
                  </div>
                </div>

                <div className="h-3 w-0.5 bg-gray-300 dark:bg-white"></div>

                {/* API */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 border-2 border-gray-300 dark:border-white bg-black dark:bg-white rounded-lg flex items-center justify-center">
                    <span className="font-mono font-semibold text-xs text-white dark:text-black">
                      API
                    </span>
                  </div>
                </div>

                <div className="h-3 w-0.5 bg-gray-300 dark:bg-white"></div>

                {/* Database */}
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 border-2 border-gray-300 dark:border-white bg-gray-100 dark:bg-[#1a1a1a] rounded-lg flex items-center justify-center">
                    <span className="font-mono font-semibold text-xs text-black dark:text-white">
                      DB
                    </span>
                  </div>
                </div>
              </div>

              {/* Desktop Database - positioned below on desktop */}
              <div className="hidden md:flex justify-center mt-4">
                <div className="flex flex-col items-center">
                  <div className="w-16 md:w-20 h-16 md:h-20 border-2 border-gray-300 dark:border-white bg-gray-100 dark:bg-[#1a1a1a] rounded-lg flex items-center justify-center">
                    <span className="font-mono font-semibold text-xs md:text-sm dark:text-white">
                      DB
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
