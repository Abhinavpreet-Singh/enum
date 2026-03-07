"use client";
import Header from "@/components/header";
import Footer from "@/components/footer";

export default function PrivacyPage() {
  const sections = [
    {
      num: "01",
      heading: "Information We Collect",
      body: "We collect information you provide when you create or update an account — like your email and display name — as well as data generated as you use the platform, such as progress tracking, simulation results, and feature interactions.",
      list: [
        "Account details (email, username, preferences)",
        "Usage data (simulations attempted, results, timestamps)",
        "Device and browser information for performance and security",
      ],
    },
    {
      num: "02",
      heading: "How We Use Your Data",
      body: "We use your data to deliver the service, personalize your experience, and keep the platform secure and reliable. That includes analytics to improve features, sending important account notifications, and preventing abuse.",
    },
    {
      num: "03",
      heading: "Cookies & Tracking",
      body: "We use cookies and similar technologies to remember your preferences, enable core functionality, and measure usage patterns. You can control cookie settings through your browser.",
    },
    {
      num: "04",
      heading: "Security",
      body: "We take reasonable steps to protect your information, including encrypting sensitive data and monitoring for unauthorized access. However, no system is completely secure — please keep your account credentials safe.",
    },
    {
      num: "05",
      heading: "Your Choices",
      body: "You can update your profile, adjust communication preferences, or request deletion of your account at any time. If you have questions or want to exercise your rights, reach out via the Contact page.",
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <Header />
      <main className="max-w-3xl mx-auto px-4 md:px-6 pt-32 pb-24">
        {/* Breadcrumb */}
        <p className="font-mono text-[11px] tracking-[0.3em] text-gray-400 uppercase mb-6">
          ENUM / LEGAL
        </p>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-black dark:text-white mb-4">
          Privacy Policy
        </h1>
        <div className="h-px bg-gray-200 dark:bg-white/10 mb-8" />

        <p className="font-mono text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-16">
          At Enum, we treat your data with care. This policy explains what
          information we collect, how we use it, and the controls you have. Last
          updated: March 2026.
        </p>

        <div className="space-y-12">
          {sections.map((s) => (
            <div key={s.num}>
              <div className="flex items-start gap-6 mb-4">
                <span className="font-mono text-[11px] tracking-[0.2em] text-gray-300 dark:text-gray-700 mt-1 shrink-0">
                  {s.num}
                </span>
                <h2 className="text-xl font-bold tracking-tight text-black dark:text-white">
                  {s.heading}
                </h2>
              </div>
              <div className="pl-12">
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                  {s.body}
                </p>
                {s.list && (
                  <ul className="mt-4 space-y-2">
                    {s.list.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-3 font-mono text-xs text-gray-500 dark:text-gray-400"
                      >
                        <span className="mt-0.5 text-gray-300 dark:text-gray-700">
                          —
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="h-px bg-gray-100 dark:bg-white/5 mt-10" />
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
