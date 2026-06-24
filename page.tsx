import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import TrustBar from "./components/TrustBar";
import HowItWorks from "./components/HowItWorks";
import ScoreBreakdown from "./components/ScoreBreakdown";
import Calculator from "./components/Calculator";
import TierBreakdown from "./components/TierBreakdown";
import CTASection from "./components/CTASection";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />
      <TrustBar />
      <HowItWorks />
      <ScoreBreakdown />
      <Calculator />
      <TierBreakdown />
      <CTASection />
      <Footer />
    </>
  );
}
