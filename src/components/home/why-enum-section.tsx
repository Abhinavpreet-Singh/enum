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
    <section className="py-20 px-6 bg-white border-t border-gray-300">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left side - Text content */}
          <div>
            <h2 className="font-mono text-4xl font-bold mb-8 text-black tracking-tight">
              Why engineers train on Enum
            </h2>

            <ul className="space-y-4">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start text-gray-800">
                  <svg
                    className="w-6 h-6 mr-3 mt-0.5 shrink-0 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-lg">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right side - System Architecture Diagram */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 flex items-center justify-center">
            <div className="relative w-full max-w-md">
              <div className="text-xs font-mono text-gray-500 mb-8 text-center">
                SYSTEM ARCHITECTURE
              </div>

              <div className="flex items-center justify-center space-x-8 mb-8">
                {/* Client */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 border-2 border-gray-300 bg-white rounded-lg flex items-center justify-center">
                    <span className="font-mono font-semibold text-sm">
                      CLIENT
                    </span>
                  </div>
                </div>

                {/* Arrow to LB */}
                <div className="flex-1 h-0.5 bg-gray-300"></div>

                {/* Load Balancer */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 border-2 border-gray-300 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="font-mono font-semibold text-sm text-center leading-tight">
                      LB
                    </span>
                  </div>
                </div>

                {/* Arrow to API */}
                <div className="flex-1 h-0.5 bg-gray-300"></div>

                {/* API */}
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 border-2 border-gray-300 bg-black rounded-lg flex items-center justify-center">
                    <span className="font-mono font-semibold text-sm text-white">
                      API
                    </span>
                  </div>
                </div>
              </div>

              {/* Vertical line down from LB */}
              <div className="absolute left-1/2 top-28 w-0.5 h-12 bg-gray-300 -ml-px"></div>

              {/* Database */}
              <div className="flex justify-center mt-4">
                <div className="flex flex-col items-center">
                  <div className="w-20 h-20 border-2 border-gray-300 bg-gray-100 rounded-lg flex items-center justify-center">
                    <span className="font-mono font-semibold text-sm">DB</span>
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
