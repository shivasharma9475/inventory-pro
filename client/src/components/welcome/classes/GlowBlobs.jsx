const BLOBS = [
  {
    width: 300,
    height: 300,
    background: "radial-gradient(circle, rgba(124,58,237,0.15), transparent 70%)",
    top: "10%",
    left: "5%",
    borderRadius: "50%",
  },
  {
    width: 400,
    height: 400,
    background: "radial-gradient(circle, rgba(59,130,246,0.12), transparent 70%)",
    top: "40%",
    right: "5%",
    borderRadius: "50%",
  },
  {
    width: 250,
    height: 250,
    background: "radial-gradient(circle, rgba(20,184,166,0.1), transparent 70%)",
    bottom: "10%",
    left: "20%",
    borderRadius: "50%",
  },
];

export default function GlowBlobs() {
  return (
    <>
      {BLOBS.map((blob, i) => (
        <div
          key={i}
          className="absolute pointer-events-none anim-glow"
          style={{ ...blob, animationDelay: `${i * 1.2}s` }}
        />
      ))}
    </>
  );
}