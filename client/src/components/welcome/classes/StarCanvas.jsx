import { useRef } from "react";
import { useStarCanvas } from "../../hooks/useStarCanvas";

export default function StarCanvas() {
  const canvasRef = useRef(null);
  useStarCanvas(canvasRef);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: "none" }}
    />
  );
}