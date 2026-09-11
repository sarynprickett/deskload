import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isEditor, requireUser } from "@/lib/auth";
import { createIssueAction } from "@/app/actions/newsroom";
import { Notice } from "@/components/notice";

export default async function IssuesPage({ searchParams }: PageProps<"/issues">) {
  const user = await requireUser();
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  const issues = await prisma.issue.findMany({
    where: { orgId: user.orgId },
    include: {
      stories: { include: { _count: { select: { tasks: true } } } },
    },
    orderBy: { cycleStart: "desc" },
  });

  // Sensible defaults for the "new issue" form: a cycle starting today and
  // closing a week out.
  const cycleStart = new Date();
  const cycleEnd = new Date(cycleStart);
  cycleEnd.setDate(cycleEnd.getDate() + 6);
  const today = cycleStart.toISOString().slice(0, 10);
  const inAWeek = cycleEnd.toISOString().slice(0, 10);

  return (
    <div>
      <h1 className="display text-3xl font-semibold tracking-tight">Issues</h1>
      <p className="mt-2 text-muted">
        An issue is a publish cycle. Stories hang off it, and tasks hang off stories.
      </p>

      {error && <Notice tone="error">{error}</Notice>}

      {isEditor(user.role) && (
        <form
          action={createIssueAction}
          className="mt-6 p-4 rounded-lg border border-line bg-surface grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
        >
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-wider text-muted">
              New issue
            </span>
            <input
              name="name"
              placeholder="Vol. 118, Issue 10"
              required
              className="px-3 py-2 rounded-md border border-line bg-background"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-wider text-muted">Opens</span>
            <input
              type="date"
              name="cycleStart"
              defaultValue={today}
              required
              className="px-3 py-2 rounded-md border border-line bg-background"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-wider text-muted">Closes</span>
            <input
              type="date"
              name="cycleEnd"
              defaultValue={inAWeek}
              required
              className="px-3 py-2 rounded-md border border-line bg-background"
            />
          </label>
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-accent text-white text-sm hover:opacity-90 transition-opacity cursor-pointer"
          >
            Create
          </button>
        </form>
      )}

      <ul className="grid gap-3 mt-8">
        {issues.map((issue) => {
          const tasks = issue.stories.reduce((n, s) => n + s._count.tasks, 0);
          return (
            <li key={issue.id}>
              <Link
                href={`/issues/${issue.id}`}
                className="block px-4 py-4 rounded-lg border border-line bg-surface hover:border-accent transition-colors"
              >
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="display text-lg font-semibold">{issue.name}</span>
                  <StatusPill status={issue.status} />
                  <span className="text-xs text-muted">
                    {issue.cycleStart.toLocaleDateString()} –{" "}
                    {issue.cycleEnd.toLocaleDateString()}
                  </span>
                  <span className="ml-auto text-sm text-muted">
                    {issue.stories.length} stories · {tasks} tasks
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {issues.length === 0 && (
        <p className="mt-8 text-sm text-muted">
          No issues yet.
          {isEditor(user.role)
            ? " Create one above."
            : " An editor needs to create one first."}
        </p>
      )}
    </div>
  );
}

export function StatusPill({ status }: { status: "OPEN" | "CLOSED" }) {
  return (
    <span
      className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${
        status === "OPEN"
          ? "border-under/40 bg-under-soft text-under"
          : "border-line bg-surface-muted text-muted"
      }`}
    >
      {status.toLowerCase()}
    </span>
  );
}
