import { requireEditor } from "@/lib/auth";
import { weeklyWorkload } from "@/lib/scoring";

/**
 * Weekly workload report (§6) — editors and admins only.
 *
 * §7 is explicit that this is a private management signal, never a public list:
 * flagging someone as overloaded shouldn't also broadcast that someone else is
 * underloaded. The framing here is a prompt to check in or to hand out work,
 * not a ranking.
 */
export default async function WeeklyReportPage() {
  const user = await requireEditor();
  const { weekKeys, series, flags } = await weeklyWorkload(user.orgId, {
    overload: user.org.overloadThreshold,
    underload: user.org.underloadThreshold,
  });

  const overloaded = flags.filter((f) => f.kind === "OVERLOADED");
  const capacity = flags.filter((f) => f.kind === "HAS_CAPACITY");
  const max = Math.max(
    1,
    ...series.flatMap((s) => s.recent.map((r) => r.weighted)),
  );

  const fmtWeek = (k: string) => {
    const d = new Date(`${k}T00:00:00`);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  return (
    <div>
      <h1 className="display text-3xl font-semibold tracking-tight">
        Weekly workload
      </h1>
      <p className="mt-2 text-muted max-w-2xl">
        Private to editors and admins. Someone is flagged only after two or more
        consecutive weeks past a threshold, so one heavy week doesn&rsquo;t
        trigger a check-in that isn&rsquo;t warranted.
      </p>
      <p className="mt-2 text-xs text-muted">
        Thresholds: over {user.org.overloadThreshold} pts/week is
        &ldquo;carrying a lot&rdquo;, under {user.org.underloadThreshold}{" "}
        pts/week is &ldquo;has capacity&rdquo;. The current, incomplete week
        isn&rsquo;t counted toward a streak.
      </p>

      <div className="grid gap-6 sm:grid-cols-2 mt-8">
        <section>
          <div className="rule pb-2 mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-over">
              Carrying too much — check in
            </h2>
          </div>
          {overloaded.length === 0 ? (
            <p className="text-sm text-muted">
              Nobody is over the line two weeks running.
            </p>
          ) : (
            <ul className="grid gap-2">
              {overloaded.map((f) => (
                <li
                  key={f.userId}
                  className="px-4 py-3 rounded-lg border border-over/30 bg-over-soft"
                >
                  <div className="font-medium">{f.name}</div>
                  <div className="text-sm text-over mt-0.5">
                    {f.consecutiveWeeks} consecutive weeks over the threshold —{" "}
                    {f.latestWeighted} pts last week
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="rule pb-2 mb-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-under">
              Has capacity — safe to assign more
            </h2>
          </div>
          {capacity.length === 0 ? (
            <p className="text-sm text-muted">
              Nobody is consistently under the line.
            </p>
          ) : (
            <ul className="grid gap-2">
              {capacity.map((f) => (
                <li
                  key={f.userId}
                  className="px-4 py-3 rounded-lg border border-under/30 bg-under-soft"
                >
                  <div className="font-medium">{f.name}</div>
                  <div className="text-sm text-under mt-0.5">
                    {f.consecutiveWeeks} consecutive weeks under the threshold —{" "}
                    {f.latestWeighted} pts last week
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-10">
        <div className="rule pb-2 mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Last {weekKeys.length} weeks
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-140">
            <thead>
              <tr className="text-left">
                <th className="py-2 pr-4 font-medium text-muted text-xs uppercase tracking-wider">
                  Person
                </th>
                {weekKeys.map((k, i) => (
                  <th
                    key={k}
                    className="py-2 px-2 font-medium text-muted text-xs uppercase tracking-wider text-right whitespace-nowrap"
                  >
                    {fmtWeek(k)}
                    {i === weekKeys.length - 1 && (
                      <span className="block text-[10px] normal-case tracking-normal">
                        in progress
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series.map(({ user: person, recent }) => (
                <tr key={person.id} className="border-t border-line">
                  <td className="py-2 pr-4 whitespace-nowrap">{person.name}</td>
                  {recent.map((w, i) => {
                    const over = w.weighted > user.org.overloadThreshold;
                    const under = w.weighted < user.org.underloadThreshold;
                    const current = i === weekKeys.length - 1;
                    return (
                      <td key={w.week} className="py-2 px-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="h-1.5 w-14 rounded-full bg-surface-muted overflow-hidden">
                            <div
                              className={`h-full ${
                                over ? "bg-over" : under ? "bg-under/60" : "bg-accent/60"
                              }`}
                              style={{
                                width: `${Math.min(100, (w.weighted / max) * 100)}%`,
                              }}
                            />
                          </div>
                          <span
                            className={`tabular-nums w-9 ${
                              current ? "text-muted" : over ? "text-over" : ""
                            }`}
                          >
                            {w.weighted}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
