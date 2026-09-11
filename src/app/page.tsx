import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isEditor, requireUser } from "@/lib/auth";
import { cumulativeScoreboard, startOfWeek, weeklyWorkload } from "@/lib/scoring";
import { StatCard } from "@/components/stat-card";

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const user = await requireUser();
  const params = await searchParams;
  const denied = typeof params.denied === "string" ? params.denied : null;

  const weekStart = startOfWeek(new Date());
  const [openIssues, thisWeek, allTime] = await Promise.all([
    prisma.issue.findMany({
      where: { orgId: user.orgId, status: "OPEN" },
      include: {
        stories: { include: { _count: { select: { tasks: true } } } },
      },
      orderBy: { cycleEnd: "asc" },
    }),
    cumulativeScoreboard(user.orgId, { from: weekStart }),
    cumulativeScoreboard(user.orgId),
  ]);

  const mineWeek = thisWeek.find((p) => p.userId === user.id);
  const mineAll = allTime.find((p) => p.userId === user.id);

  const awaitingConfirm = await prisma.task.count({
    where: { status: "COMPLETED", story: { issue: { orgId: user.orgId } } },
  });

  const flags = isEditor(user.role)
    ? (
        await weeklyWorkload(user.orgId, {
          overload: user.org.overloadThreshold,
          underload: user.org.underloadThreshold,
        })
      ).flags
    : [];

  return (
    <div>
      {denied && (
        <div className="mb-6 px-4 py-3 rounded-lg border border-line bg-pending-soft text-sm">
          {denied === "editors-only"
            ? "That page is limited to editors and admins."
            : "That page is limited to admins."}
        </div>
      )}

      <h1 className="display text-3xl font-semibold tracking-tight">
        Good to see you, {user.name.split(" ")[0]}.
      </h1>
      <p className="mt-2 text-muted">
        Here&rsquo;s what&rsquo;s on your desk and what the newsroom is carrying.
      </p>

      <div className="grid gap-4 sm:grid-cols-3 mt-8">
        <StatCard
          label="Your deskload this week"
          value={round(mineWeek?.total ?? 0)}
          hint="weighted points"
        />
        <StatCard
          label="Your deskload all time"
          value={round(mineAll?.total ?? 0)}
          hint={`${mineAll?.taskCount ?? 0} tasks credited`}
        />
        <StatCard
          label="Awaiting confirmation"
          value={awaitingConfirm}
          hint="newsroom-wide"
          tone={awaitingConfirm > 0 ? "pending" : "neutral"}
        />
      </div>

      {isEditor(user.role) && flags.length > 0 && (
        <section className="mt-10">
          <div className="rule pb-2 mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Workload signals
            </h2>
            <Link href="/reports/weekly" className="text-xs text-accent hover:underline">
              Full weekly report →
            </Link>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {flags.map((f) => (
              <li
                key={f.userId}
                className={`px-4 py-3 rounded-lg border text-sm ${
                  f.kind === "OVERLOADED"
                    ? "border-over/30 bg-over-soft"
                    : "border-under/30 bg-under-soft"
                }`}
              >
                <span className="font-medium">{f.name}</span>{" "}
                <span className={f.kind === "OVERLOADED" ? "text-over" : "text-under"}>
                  {f.kind === "OVERLOADED"
                    ? `is carrying a lot — ${f.consecutiveWeeks} weeks running`
                    : `has capacity — ${f.consecutiveWeeks} weeks running`}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">
            Private to editors and admins. Never posted newsroom-wide.
          </p>
        </section>
      )}

      <section className="mt-10">
        <div className="rule pb-2 mb-4 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Open issues
          </h2>
          <Link href="/issues" className="text-xs text-accent hover:underline">
            All issues →
          </Link>
        </div>

        {openIssues.length === 0 ? (
          <EmptyState
            title="No open issues"
            body="Create an issue to start attaching stories and logging the work."
            href="/issues"
            cta="Go to issues"
          />
        ) : (
          <ul className="grid gap-3">
            {openIssues.map((issue) => (
              <li key={issue.id}>
                <Link
                  href={`/issues/${issue.id}`}
                  className="block px-4 py-4 rounded-lg border border-line bg-surface hover:border-accent transition-colors"
                >
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="display text-lg font-semibold">
                      {issue.name}
                    </span>
                    <span className="text-xs text-muted">
                      closes {issue.cycleEnd.toLocaleDateString()}
                    </span>
                    <span className="ml-auto text-sm text-muted">
                      {issue.stories.length} stories ·{" "}
                      {issue.stories.reduce((n, s) => n + s._count.tasks, 0)} tasks
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}

function EmptyState({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="px-5 py-8 rounded-lg border border-dashed border-line text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted">{body}</p>
      <Link
        href={href}
        className="inline-block mt-4 px-4 py-2 rounded-md bg-accent text-white text-sm hover:opacity-90 transition-opacity"
      >
        {cta}
      </Link>
    </div>
  );
}
