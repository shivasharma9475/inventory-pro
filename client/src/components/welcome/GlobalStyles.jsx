export default function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Lato:wght@100;300;400&display=swap');

      @keyframes fadeDown {
        from { opacity: 0; transform: translateY(-18px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(18px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes glowPulse {
        0%, 100% { opacity: 0.5; }
        50%       { opacity: 1; }
      }
      @keyframes rotateSlow {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
      @keyframes orbit {
        from { transform: rotateZ(0deg) translateX(110px) rotateZ(0deg); }
        to   { transform: rotateZ(360deg) translateX(110px) rotateZ(-360deg); }
      }

      .anim-fade-down { animation: fadeDown 0.9s ease both; }
      .anim-fade-up   { animation: fadeUp  0.9s ease both; }
      .anim-glow      { animation: glowPulse 3s ease-in-out infinite; }
      .anim-rotate    { animation: rotateSlow 20s linear infinite; }
      .orbit-dot      { animation: orbit 8s linear infinite; }

      .btn-primary {
        background: linear-gradient(135deg, #7c3aed, #3b82f6);
        transition: opacity 0.2s, transform 0.15s;
      }
      .btn-primary:hover  { opacity: 0.85; transform: translateY(-2px); }
      .btn-primary:active { transform: scale(0.97); }

      .btn-ghost {
        border: 0.5px solid rgba(255,255,255,0.22);
        transition: background 0.2s, color 0.2s, transform 0.15s;
      }
      .btn-ghost:hover {
        background: rgba(255,255,255,0.08);
        color: white;
        transform: translateY(-2px);
      }
      .btn-ghost:active { transform: scale(0.97); }

      .brand-gradient {
        background: linear-gradient(135deg, #a78bfa, #60a5fa);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    `}</style>
  );
}