import { useRef } from "react";
import GlobalStyles from "../components/welcome/GlobalStyles";
import { useStarCanvas } from "../components/hooks/useStarCanvas";
import GlowBlobs from "../components/welcome/classes/GlowBlobs";
import OrbitRings from "../components/welcome/classes/OrbitRings";
import LogoBadge from "../components/welcome/classes/LogoBadge";
import HeroText from "../components/welcome/classes/HeroText";
import CTAButtons from "../components/welcome/tagline/CTAButtons";
import StatsRow from "../components/welcome/buttons/StatsRow";
import FeatureChips from "../components/welcome/buttons/FeatureChips";

export default function Welcome() {
  const canvasRef = useRef(null);

  useStarCanvas(canvasRef); // ✅ correct usage

  return (
    <div
      className="relative w-full min-h-screen overflow-hidden flex items-center justify-center"
      style={{
        background:
          "radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)",
        fontFamily: "'Lato', sans-serif",
      }}
    >
      <GlobalStyles />

      {/* Background layers */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <GlowBlobs />
      <OrbitRings />

      {/* Hero content */}
      <div className="relative z-10 text-center px-6 py-10 max-w-3xl mx-auto">
        <LogoBadge />
        <HeroText />
        <CTAButtons />
        <StatsRow />
        <FeatureChips />

        <p
          className="mt-10 text-xs font-light tracking-widest anim-fade-up"
          style={{ color: "rgba(255,255,255,0.2)", animationDelay: "0.8s" }}
        >
          Powered by artificial intelligence · Built for scale
        </p>
      </div>
    </div>
  );
}