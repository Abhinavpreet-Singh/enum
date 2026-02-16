"use client";

const benefits = [
  {
    audience: "Students",
    description: "Become job-ready before joining companies",
  },
  {
    audience: "Colleges",
    description: "Structured practical training tool",
  },
  {
    audience: "Recruiters",
    description: "Real signal of engineering readiness",
  },
  {
    audience: "Companies",
    description: "Faster onboarding, lower training cost",
  },
];

export default function BenefitsSection() {
  return (
    <section className="py-16 md:py-20 px-4 md:px-6 bg-white border-t border-gray-300">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="mb-12 md:mb-16">
          <h2 className="font-mono text-2xl md:text-4xl font-bold mb-3 md:mb-4 text-black tracking-tight">
            Who Benefits
          </h2>
          <p className="text-gray-700 text-xs md:text-sm font-mono tracking-[0.05em] max-w-2xl">
            Training that bridges the gap between learning and real-world
            engineering
          </p>
        </div>

        {/* Benefits grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="bg-gray-50 border border-gray-200 rounded-lg p-4 md:p-6 hover:border-gray-300 transition-all text-center"
            >
              <h3 className="text-lg md:text-xl font-bold mb-2 text-black">
                {benefit.audience}
              </h3>
              <p className="text-gray-700 text-xs md:text-sm">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        {/* Vision statement */}
        <div className="mt-12 md:mt-20 text-center">
          <div className="max-w-3xl mx-auto bg-gray-50 border border-gray-200 rounded-lg p-6 md:p-12">
            <h3 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6 text-black">
              &quot;The flight simulator for software engineers.&quot;
            </h3>
            <p className="text-gray-700 text-base md:text-lg leading-relaxed">
              Pilots don&apos;t train by reading theory.{" "}
              <br className="hidden md:block" />
              Engineers shouldn&apos;t either.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
