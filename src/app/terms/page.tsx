"use client";
import Header from "@/components/header";
import Footer from "@/components/footer";

export default function TermsPage() {
  const sections = [
    {
      num: "01",
      heading: "Accepting the Terms",
      body: "By creating an account or using Enum, you agree to follow these terms. If you do not agree, please do not use the platform.",
    },
    {
      num: "02",
      heading: "Account Responsibilities",
      body: "You are responsible for maintaining the confidentiality of your account credentials. You agree not to share your account or use someone else's account without permission.",
    },
    {
      num: "03",
      heading: "Acceptable Use",
      body: "You agree not to abuse the platform, attempt to breach security, or use the service in a way that harms others. We reserve the right to suspend or terminate accounts that violate these rules.",
    },
    {
      num: "04",
      heading: "Modifications",
      body: "We may update these terms from time to time. Changes are effective when posted — continuing to use the platform after changes are made means you accept the updated terms.",
    },
    {
      num: "05",
      heading: "Limitation of Liability",
      body: "To the maximum extent permitted by law, Enum and its affiliates are not liable for indirect damages, lost profits, or other losses arising from your use of the platform.",
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
          Terms &amp; Conditions
        </h1>
        <div className="h-px bg-gray-200 dark:bg-white/10 mb-8" />

        <p className="font-mono text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-16">
          These terms govern your access to and use of Enum. By using or
          accessing the platform, you agree to these terms — please read them
          carefully. Last updated: March 2026.
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
