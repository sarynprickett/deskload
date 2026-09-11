import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isEditor, requireUser } from "@/lib/auth";
import { createStoryAction, setIssueStatusAction } from "@/app/actions/newsroom";
import { Notice } from "@/components/notice";
import { StatusPill } from "@/app/issues/page";

export default async function IssuePage({
  params,
  searchParams,
}: PageProps<"/issues/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;

  const issue = await prisma.issue.findFirst({
    where: { id, orgId: user.orgId },
    include: {
      stories: {
        include: { tasks: { select: { status: true, weight: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!issue) notFound();

  const editor = isEditor(user.role);
  const awaiting = issue.stories.reduce(
    (n, s) => n + s.tasks.filter((t) => t.status === "COMPLETED").length,
    0,
  );

  return (
    <div>
      <Link href="/issues" className="text-xs text-muted hover:text-accent">
        ← All issues
      </Link>

      <div className="mt-2 flex items-baseline gap-3 flex-wrap">
        <h1 className="display text-3xl font-semibold tracking-tight">
          {issue.name}
        </h1>
        <StatusPill status={issue.status} />
        <span className="text-sm text-muted">
          {issue.cycleStart.toLocaleDateString()} –{" "}
          {issue.cycleEnd.toLocaleDateString()}
        </span>

        {editor && (
          <form action={setIssueStatusAction} className="ml-auto">
            <input type="hidden" name="issueId" value={issue.id} />
            <input
              type="hidden"
              name="status"
              value={issue.status === "OPEN" ? "CLOSED" : "OPEN"}
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-md border border-line text-sm hover:border-accent transition-colors cursor-pointer"
            >
              {issue.status === "OPEN" ? "Close issue" : "Reopen issue"}
            </button>
          </form>
        )}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {issue.status === "OPEN" && awaiting > 0 && editor && (
        <Notice>
          {awaiting} task{awaiting === 1 ? "" : "s"} in this issue are waiting to be
          confirmed. Confirming is one tap per story — open a story and use
          &ldquo;Confirm all&rdquo;.
        </Notice>
      )}

      {issue.status === "CLOSED" && (
        <Notice>
          This issue is closed, so its stories and tasks are locked. Reopen it to
          log more work.
        </Notice>
      )}

      {issue.status === "OPEN" && (
        <form
          action={createStoryAction}
          className="mt-6 p-4 rounded-lg border border-line bg-surface flex gap-3 flex-wrap items-end"
        >
          <input type="hidden" name="issueId" value={issue.id} />
          <label className="grid gap-1 flex-1 min-w-60">
            <span className="text-xs uppercase tracking-wider text-muted">
              Add a story
            </span>
            <input
              name="title"
              placeholder="Provost defends tuition increase at packed forum"
              required
              className="px-3 py-2 rounded-md border border-line bg-background w-full"
            />
          </label>
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-accent text-white text-sm hover:opacity-90 transition-opacity cursor-pointer"
          >
            Create story
          </button>
        </form>
      )}

      <section className="mt-8">
        <div className="rule pb-2 mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Stories
          </h2>
        </div>

        {issue.stories.length === 0 ? (
          <p className="text-sm text-muted">
            No stories on this issue yet. A story takes about ten seconds to
            create — a title is enough to start.
          </p>
        ) : (
          <ul className="grid gap-2">
            {issue.stories.map((story) => {
              const confirmed = story.tasks.filter((t) => t.status === "CONFIRMED");
              const pending = story.tasks.filter((t) => t.status === "COMPLETED");
              const assigned = story.tasks.filter((t) => t.status === "ASSIGNED");
              return (
                <li key={story.id}>
                  <Link
                    href={`/stories/${story.id}`}
                    className="block px-4 py-3 rounded-lg border border-line bg-surface hover:border-accent transition-colors"
                  >
                    <div className="flex items-baseline gap-3 flex-wrap">
                      <span className="font-medium">{story.title}</span>
                      <span className="ml-auto flex items-center gap-2 text-xs">
                        {assigned.length > 0 && (
                          <span className="text-muted">
                            {assigned.length} assigned
                          </span>
                        )}
                        {pending.length > 0 && (
                          <span className="px-1.5 py-0.5 rounded border border-pending/40 bg-pending-soft text-pending">
                            {pending.length} unconfirmed
                          </span>
                        )}
                        <span className="text-muted">
                          {confirmed.length} confirmed
                        </span>
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
