"use client";

const steps = [
  {
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    ),
    title: "1. Choose a role",
    description:
      "Select from Frontend, Backend, or DevOps tracks. Each simulation mirrors a real job ticket.",
  },
  {
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
        />
      </svg>
    ),
    title: "2. Debug live apps",
    description:
      "No puzzles. You get full access to a codebase, logs, and a broken production environment.",
  },
  {
    icon: (
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    title: "3. Fix & Verify",
    description:
      "Deploy your fix. Our engine runs regression tests and evaluates your solution instantly.",
  },
];

// const tracks = [
//   {
//     name: "Frontend",
//     icon: "⚡",
//     color: "bg-blue-50 border-blue-200 text-blue-700",
//   },
//   {
//     name: "Backend",
//     icon: "⚙️",
//     color: "bg-purple-50 border-purple-200 text-purple-700",
//   },
//   {
//     name: "DevOps",
//     icon: "🚀",
//     color: "bg-green-50 border-green-200 text-green-700",
//   },
//   {
//     name: "ML",
//     icon: "🧠",
//     color: "bg-orange-50 border-orange-200 text-orange-700",
//   },
// ];

export default function HowItWorksSection() {
  return (
    <section className="py-20 px-6 bg-white border-t border-gray-300">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="mb-16">
          <h2 className="font-mono text-4xl font-bold mb-4 text-black tracking-tight">
            How Enum Works
          </h2>
          <p className="text-gray-700 text-sm font-mono tracking-[0.05em] max-w-2xl">
            Production-style simulations that train you for real engineering
            work
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 hover:border-gray-300 transition-all h-full">
                {/* Icon */}
                <div className="mb-4 text-black">{step.icon}</div>

                {/* Title */}
                <h3 className="text-xl font-bold mb-3 text-black">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-gray-700 leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Arrow between steps (hidden on last item and mobile) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                  <svg
                    className="w-8 h-8 text-gray-300"
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
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
