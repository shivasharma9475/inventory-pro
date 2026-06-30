export default function HeroText() {
  return (
    <>
      {/* Welcome label */}
      <p
        className="text-xs tracking-widest uppercase font-light mb-3 anim-fade-down"
        style={{ color: "rgba(255,255,255,0.35)", animationDelay: "0.1s" }}
      >
        Welcome to
      </p>

      {/* Brand heading */}
      <h1
        className="font-thin leading-tight mb-4 anim-fade-down"
        style={{
          fontSize: "clamp(52px, 9vw, 96px)",
          letterSpacing: "0.16em",
          color: "#fff",
          animationDelay: "0.2s",
        }}
      >
        Inventory
        <span className="brand-gradient font-light">Pro</span>
      </h1>

      {/* Tagline */}
      <p
        className="font-light mb-10 anim-fade-down"
        style={{
          fontSize: "clamp(14px, 2vw, 18px)",
          color: "rgba(255,255,255,0.4)",
          letterSpacing: "0.05em",
          animationDelay: "0.32s",
        }}
      >
        AI-powered inventory management —{" "}
        <span style={{ color: "rgba(255,255,255,0.6)" }}>
          smarter, faster, effortless.
        </span>
      </p>
    </>
  );
}