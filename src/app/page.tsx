import Header from "@/components/header";
import Footer from "@/components/footer";
import HeroSection from "@/components/home/hero-section";
import LatestIncidentsSection from "@/components/home/latest-incidents-section";
import WhyEnumSection from "@/components/home/why-enum-section";
import HowItWorksSection from "@/components/home/how-it-works-section";
import BenefitsSection from "@/components/home/benefits-section";

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <LatestIncidentsSection />
        <BenefitsSection />
        <WhyEnumSection />
      </main>
      <Footer />
    </div>
  );
}
