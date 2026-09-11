export function Notice({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "error" | "success";
}) {
  const cls = {
    info: "border-line bg-surface-muted",
    error: "border-over/30 bg-over-soft text-over",
    success: "border-under/30 bg-under-soft text-under",
  }[tone];
  return (
    <div className={`mt-4 px-4 py-3 rounded-lg border text-sm ${cls}`}>
      {children}
    </div>
  );
}
