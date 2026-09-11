export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "neutral" | "pending" | "over" | "under";
}) {
  const toneClass = {
    neutral: "border-line bg-surface",
    pending: "border-pending/30 bg-pending-soft",
    over: "border-over/30 bg-over-soft",
    under: "border-under/30 bg-under-soft",
  }[tone];

  return (
    <div className={`px-4 py-4 rounded-lg border ${toneClass}`}>
      <div className="text-xs uppercase tracking-wider text-muted">{label}</div>
      <div className="display text-3xl font-semibold mt-1 tabular-nums">
        {value}
      </div>
      {hint && <div className="text-xs text-muted mt-1">{hint}</div>}
    </div>
  );
}
