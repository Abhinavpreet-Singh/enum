import Header from "@/components/header";
import Footer from "@/components/footer";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-5xl mx-auto px-4 md:px-6 pt-28 pb-16 font-sans">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-black dark:text-white mb-6">
          Privacy Policy
        </h1>
        <p className="text-base md:text-lg text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
          At Enum, we treat your data with care. This policy explains the kinds of information we collect, how we use it, and the
          controls you have over your personal information.
        </p>

        <section className="space-y-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-black dark:text-white mb-3">
              Information We Collect
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
              We collect information you provide when you create or update an account (like email and display name), as well as
              data generated as you use the platform (such as progress tracking, simulation results, and feature usage).
            </p>
            <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-2 leading-relaxed">
              <li>Account details (email, username, preferences)</li>
              <li>Usage data (simulations attempted, results, timestamps)</li>
              <li>Device and browser information for performance and security</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-black dark:text-white mb-3">
              How We Use Your Data
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              We use your data to deliver the service, personalize your experience, and keep the platform secure and reliable.
              That includes using analytics to improve features, sending important account notifications, and preventing abuse.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-black dark:text-white mb-3">
              Cookies & Tracking
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              We use cookies and similar technologies to remember your preferences, enable core functionality, and measure
              usage patterns. You can control cookie settings through your browser.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-black dark:text-white mb-3">
              Security
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              We take reasonable steps to protect your information, including encrypting sensitive data and monitoring for
              unauthorized access. However, no system is completely secure, so please keep your account credentials safe.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-black dark:text-white mb-3">
              Your Choices
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              You can update your profile, adjust communication preferences, or request deletion of your account at any time.
              If you have questions or want to exercise your rights, contact us using the details in the footer.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
