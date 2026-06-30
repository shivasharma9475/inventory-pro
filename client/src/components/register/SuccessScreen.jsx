import { useRef } from "react";
import { useStarCanvas } from "../hooks/useStarCanvas";
import { fonts } from "./styles/register";

export function SuccessScreen({ onReset }) {
  const canvasRef = useRef(null);
  useStarCanvas(canvasRef);

  return (
    <div
      className="relative w-full min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)" }}
    >
      <style>{fonts}</style>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "none" }}
      />

      <div
        className="relative z-10 text-center px-6"
        style={{ animation: "fadeDown 0.7s ease both" }}
      >
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{
            background: "rgba(167,139,250,0.15)",
            border: "0.5px solid rgba(167,139,250,0.4)",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
            <path
              d="M8 18l7 7 13-13"
              stroke="#a78bfa"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <p className="text-sm font-light" style={{ color: "rgba(255,255,255,0.45)" }}>
          Welcome to InventoryPro. Please verify your email to continue.
        </p>

        <button
          className="mt-8 px-8 py-3 rounded-full text-sm font-light tracking-wider text-white"
          style={{
            background: "linear-gradient(135deg,#7c3aed,#3b82f6)",
            fontFamily: "'DM Sans',sans-serif",
          }}
          onClick={onReset}
        >
          Back to Register
        </button>
      </div>
    </div>
  );
}