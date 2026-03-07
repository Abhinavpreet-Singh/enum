import Header from "@/components/header";
import Footer from "@/components/footer";

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-5xl mx-auto px-4 md:px-6 pt-28 pb-16 font-sans">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-black dark:text-white mb-6">
          Terms & Conditions
        </h1>
        <p className="text-base md:text-lg text-gray-700 dark:text-gray-300 mb-8 leading-relaxed">
          These terms govern your access to and use of Enum. By using or accessing the platform, you agree to these
          terms, so please read them carefully.
        </p>

        <section className="space-y-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-black dark:text-white mb-3">
              Accepting the Terms
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              By creating an account or using Enum, you agree to follow these terms. If you do not agree, please do not use
              the platform.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-black dark:text-white mb-3">
              Account Responsibilities
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials. You agree not to share your
              account or use someone else’s account without permission.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-black dark:text-white mb-3">
              Acceptable Use
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              You agree not to abuse the platform, attempt to breach security, or use the service in a way that harms others.
              We reserve the right to suspend or terminate accounts violating these rules.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-black dark:text-white mb-3">
              Modifications
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              We may update these terms from time to time. Changes will be effective when posted, and continuing to use the
              platform after changes means you accept the updated terms.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-black dark:text-white mb-3">
              Limitation of Liability
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              To the maximum extent permitted by law, Enum and its affiliates are not liable for indirect damages, lost
              profits, or other losses arising from your use of the platform.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
