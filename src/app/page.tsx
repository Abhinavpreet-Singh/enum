import Header from "@/components/header";
import Footer from "@/components/footer";
import HeroSection from "@/components/home/hero-section";
import LatestIncidentsSection from "@/components/home/latest-incidents-section";
import HowItWorksSection from "@/components/home/how-it-works-section";
import BenefitsSection from "@/components/home/benefits-section";
import FeaturesSection from "@/components/home/features-section";
import PricingSection from "@/components/home/pricing-section";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <FeaturesSection />
        <LatestIncidentsSection />
        <PricingSection />
        <BenefitsSection />
      </main>
      <Footer />
    </div>
  );
}
