import { requireUser } from "@/lib/auth";
import { isEditor } from "@/lib/auth";
import { cumulativeScoreboard } from "@/lib/scoring";
import { Notice } from "@/components/notice";

/**
 * Cumulative scoreboard (§6). Deliberately framed as a record of distribution,
 * not a ranking: no medals, no streaks, no "top contributor". §7 governs who
 * can see whose numbers.
 */
export default async function ScoreboardPage() {
  const user = await requireUser();
  const rows = await cumulativeScoreboard(user.orgId);

  const editor = isEditor(user.role);
  const mastheadWide = user.org.scoreboardVisibility === "MASTHEAD";
  const visibleRows = editor || mastheadWide
    ? rows
    : rows.filter((r) => r.userId === user.id);

  const max = Math.max(1, ...rows.map((r) => r.total));
  const totalRecorded = rows.reduce((n, r) => n + r.total, 0);

  return (
    <div>
      <h1 className="display text-3xl font-semibold tracking-tight">Scoreboard</h1>
      <p className="mt-2 text-muted max-w-2xl">
        The recorded distribution of labor across the newsroom — the artifact you
        hand a promotion committee or a faculty advisor. Confirmed work is
        counted separately from work that hasn&rsquo;t been confirmed yet.
      </p>

      {!editor && !mastheadWide && (
        <Notice>
          Your newsroom keeps the scoreboard private, so you can see your own
          deskload here. An admin can make it masthead-wide in settings.
        </Notice>
      )}

      <div className="mt-8 rule pb-2 mb-4 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider">
          All time
        </h2>
        <span className="text-xs text-muted">
          {Math.round(totalRecorded)} weighted points recorded
        </span>
      </div>

      {visibleRows.length === 0 ? (
        <p className="text-sm text-muted">
          Nothing recorded yet. Log a task on a story and it will show up here.
        </p>
      ) : (
        <ul className="grid gap-3">
          {visibleRows.map((row) => {
            const pct = (row.total / max) * 100;
            const confirmedPct = row.total > 0 ? (row.confirmed / row.total) * 100 : 0;
            return (
              <li
                key={row.userId}
                className="px-4 py-4 rounded-lg border border-line bg-surface"
              >
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="font-medium">{row.name}</span>
                  {row.userId === user.id && (
                    <span className="text-[10px] uppercase tracking-wider text-muted">
                      you
                    </span>
                  )}
                  <span className="ml-auto display text-xl font-semibold tabular-nums">
                    {Math.round(row.total * 10) / 10}
                  </span>
                  <span className="text-xs text-muted">pts</span>
                </div>

                <div className="mt-2 h-2 rounded-full bg-surface-muted overflow-hidden">
                  <div className="h-full flex" style={{ width: `${pct}%` }}>
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${confirmedPct}%` }}
                      title="confirmed"
                    />
                    <div
                      className="h-full bg-pending/50"
                      style={{ width: `${100 - confirmedPct}%` }}
                      title="not yet confirmed"
                    />
                  </div>
                </div>

                <div className="mt-2 flex gap-4 text-xs text-muted flex-wrap">
                  <span>{Math.round(row.confirmed * 10) / 10} confirmed</span>
                  {row.unconfirmed > 0 && (
                    <span className="text-pending">
                      {Math.round(row.unconfirmed * 10) / 10} awaiting confirmation
                    </span>
                  )}
                  <span>{row.taskCount} tasks</span>
                </div>

                <div className="mt-3 flex gap-1.5 flex-wrap">
                  {row.byType.map((t) => (
                    <span
                      key={t.taskType}
                      className="text-[11px] px-2 py-0.5 rounded-full border border-line bg-background text-muted"
                    >
                      {t.taskType}
                      <span className="tabular-nums"> · {Math.round(t.weighted * 10) / 10}</span>
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-6 text-xs text-muted max-w-2xl">
        Weighted points come from each task type&rsquo;s weight, so a headline
        swap and a full fact-check don&rsquo;t count the same. A split task
        divides its weight between the people credited.
      </p>
    </div>
  );
}
