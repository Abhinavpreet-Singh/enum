"use client";

import Link from "next/link";

interface Incident {
  id: string;
  track: string;
  title: string;
  description: string;
  difficulty: "Easy" | "Medium" | "Hard";
  timeEstimate: string;
  badgeColor: string;
}

const incidents: Incident[] = [
  {
    id: "1",
    track: "FRONTEND",
    title: "Homepage Rendering Failure",
    description:
      "The marketing homepage is crashing on mobile devices due to a hydration error in the navigation component.",
    difficulty: "Medium",
    timeEstimate: "45 mins",
    badgeColor: "bg-gray-50 text-black border-gray-200",
  },
  {
    id: "2",
    track: "BACKEND",
    title: "API Latency Spike",
    description:
      "Users are reporting timeouts on the checkout endpoint. Investigate database queries and connection pooling.",
    difficulty: "Hard",
    timeEstimate: "60 mins",
    badgeColor: "bg-gray-50 text-black border-gray-200",
  },
  {
    id: "3",
    track: "DEVOPS",
    title: "CI/CD Pipeline Broken",
    description:
      "The main build pipeline is failing on the linting step, blocking all deployments to production.",
    difficulty: "Easy",
    timeEstimate: "40 mins",
    badgeColor: "bg-gray-50 text-black border-gray-200",
  },
];

const difficultyColors = {
  Easy: "text-black",
  Medium: "text-black",
  Hard: "text-black",
};

export default function LatestIncidentsSection() {
  return (
    <section className="py-20 px-6 bg-white border-t border-gray-300">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="mb-12">
          <h2 className="font-mono text-4xl font-bold mb-4 text-black tracking-tight">
            Latest Incidents
          </h2>
          <p className="text-gray-700 text-sm font-mono tracking-[0.05em]">
            Pick a ticket and start fixing.
          </p>
        </div>

        {/* Incident cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {incidents.map((incident) => (
            <Link
              key={incident.id}
              href={`/incident/${incident.id}`}
              className="group bg-white border border-gray-200 p-6 rounded-lg hover:border-black hover:rounded-lg transition-all"
            >
              {/* Track badge and time */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-semibold border ${incident.badgeColor}`}
                >
                  {incident.track}
                </span>
                <span className="flex items-center text-xs text-gray-500 font-mono">
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
                  {incident.timeEstimate}
                </span>
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold mb-3 text-black group-hover:text-gray-700 transition-colors">
                {incident.title}
              </h3>

              {/* Description */}
              <p className="text-gray-700 text-sm leading-relaxed mb-4">
                {incident.description}
              </p>

              {/* Footer - Difficulty and arrow */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div>
                  <span className="text-xs text-gray-600">Difficulty: </span>
                  <span
                    className={`text-xs font-semibold ${difficultyColors[incident.difficulty]}`}
                  >
                    {incident.difficulty}
                  </span>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-black group-hover:translate-x-1 transition-all"
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
          ))}
        </div>

        {/* View all link */}
        <div className="text-center mt-12">
          <Link
            href="/incidents"
            className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-black transition-colors"
          >
            View all incidents
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
