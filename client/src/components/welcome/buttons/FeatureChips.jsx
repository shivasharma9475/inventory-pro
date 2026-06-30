const FEATURES = [
  { color: "#a78bfa", label: "Stock Management" },
  { color: "#60a5fa", label: "Inventory Tracking" },
  { color: "#2dd4bf", label: "Role-Based Access" },
  { color: "#fbbf24", label: "Sales Analytics" },
  { color: "#f472b6", label: "Low Stock Alerts" }
]


function FeatureChip({ color, label }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm">
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: color }}
      />
      <span className="text-xs text-white/50 tracking-wide font-light">
        {label}
      </span>
    </div>
  );
}

export default function FeatureChips() {
  return (
    <div
      className="flex items-center justify-center flex-wrap gap-2 anim-fade-up"
      style={{ animationDelay: "0.68s" }}
    >
      {FEATURES.map((f, i) => (
        <FeatureChip key={i} color={f.color} label={f.label} />
      ))}
    </div>
  );
}