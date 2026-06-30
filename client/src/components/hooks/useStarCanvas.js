import { useEffect } from "react";

export function useStarCanvas(canvasRef) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animId;
    let stars = [];

    function resize() {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    function makeStar(W, H) {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.6 + 0.3,
        speed: Math.random() * 0.35 + 0.05,
        opacity: Math.random() * 0.8 + 0.2,
        twinkle: Math.random() * Math.PI * 2,
        size: Math.floor(Math.random() * 3),
      };
    }

    function init() {
      resize();
      const W = canvas.width;
      const H = canvas.height;
      stars = Array.from({ length: 350 }, () => makeStar(W, H));
    }

    let t = 0;
    function draw() {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      t += 0.01;

      stars.forEach((s) => {
        s.y -= s.speed;
        if (s.y < 0) {
          s.y = H;
          s.x = Math.random() * W;
        }
        const op = s.opacity * (0.55 + 0.45 * Math.sin(t + s.twinkle));
        const radius = s.size === 0 ? 0.4 : s.size === 1 ? 0.9 : 1.5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${op})`;
        ctx.fill();
      });

      animId = requestAnimationFrame(draw);
    }

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
    init();
    draw();

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
    };
  }, [canvasRef]);
}
