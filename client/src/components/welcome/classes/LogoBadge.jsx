export default function LogoBadge() {
  return (
    <div
      className="inline-flex items-center gap-2 px-5 py-2 rounded-full mb-8 anim-fade-down"
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "0.5px solid rgba(255,255,255,0.15)",
        animationDelay: "0s",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="1"    y="1"    width="7.5" height="7.5" rx="1.5" fill="#a78bfa" opacity="0.9" />
        <rect x="11.5" y="1"    width="7.5" height="7.5" rx="1.5" fill="#60a5fa" opacity="0.9" />
        <rect x="1"    y="11.5" width="7.5" height="7.5" rx="1.5" fill="#60a5fa" opacity="0.6" />
        <rect x="11.5" y="11.5" width="7.5" height="7.5" rx="1.5" fill="#a78bfa" opacity="0.6" />
      </svg>
      <span
        className="text-xs font-light tracking-widest uppercase"
        style={{ color: "rgba(255,255,255,0.6)" }}
      >
        Inventory Pro
      </span>
    </div>
  );
}