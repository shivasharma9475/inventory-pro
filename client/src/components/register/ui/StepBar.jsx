export function StepBar({ total = 2, current }) {
  return (
    <div className="flex gap-2 mt-4 justify-center">
      {Array.from({ length: total }, (_, i) => i + 1).map((s) => (
        <div
          key={s}
          className="h-0.5 rounded-full transition-all duration-500"
          style={{
            width: 48,
            background:
              current >= s
                ? "linear-gradient(90deg,#7c3aed,#3b82f6)"
                : "rgba(255,255,255,0.12)",
          }}
        />
      ))}
    </div>
  );
}