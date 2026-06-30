const STATS = [
  { value: "Live",       label: "Inventory Updates" },
  { value: "Secure",     label: "Role-Based Access" },
  { value: "Smart",      label: "Stock Management" },
];

function StatBlock({ value, label }) {
  return (
    <div className="text-center px-4">
      <div className="text-2xl font-thin text-white tracking-wide">{value}</div>
      <div className="text-xs text-white/30 tracking-widest uppercase mt-1 font-light">
        {label}
      </div>
    </div>
  );
}

export default function StatsRow() {
  return (
    <div
      className="flex items-center justify-center flex-wrap gap-0 mb-10 anim-fade-up"
      style={{ animationDelay: "0.56s" }}
    >
      {STATS.map((s, i) => (
        <div key={i} className="flex items-center">
          <StatBlock value={s.value} label={s.label} />
          {i < STATS.length - 1 && (
            <div
              className="w-px self-stretch mx-1"
              style={{ background: "rgba(255,255,255,0.1)", minHeight: 36 }}
            />
          )}
        </div>
      ))}
    </div>
  );
}