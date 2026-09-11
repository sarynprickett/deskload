import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isEditor, requireUser } from "@/lib/auth";
import {
  completeTaskAction,
  confirmAllForStoryAction,
  confirmTaskAction,
  deleteTaskAction,
} from "@/app/actions/newsroom";
import { LogTaskForm } from "@/components/log-task-form";
import { Notice } from "@/components/notice";

export default async function StoryPage({
  params,
  searchParams,
}: PageProps<"/stories/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;

  const story = await prisma.story.findFirst({
    where: { id, issue: { orgId: user.orgId } },
    include: {
      issue: true,
      tasks: {
        include: {
          taskType: true,
          credits: { include: { user: true } },
          confirmedBy: true,
          loggedBy: true,
        },
        orderBy: [{ createdAt: "asc" }],
      },
    },
  });
  if (!story) notFound();

  const [taskTypes, members] = await Promise.all([
    prisma.taskType.findMany({
      where: { orgId: user.orgId, archived: false },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.user.findMany({
      where: { orgId: user.orgId, active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const editor = isEditor(user.role);
  const open = story.issue.status === "OPEN";
  const pending = story.tasks.filter((t) => t.status === "COMPLETED");
  const totalWeight = story.tasks
    .filter((t) => t.status !== "ASSIGNED")
    .reduce((n, t) => n + t.weight, 0);

  return (
    <div>
      <Link
        href={`/issues/${story.issueId}`}
        className="text-xs text-muted hover:text-accent"
      >
        ← {story.issue.name}
      </Link>

      <h1 className="display text-3xl font-semibold tracking-tight mt-2">
        {story.title}
      </h1>
      <p className="mt-2 text-sm text-muted">
        {story.tasks.length} task{story.tasks.length === 1 ? "" : "s"} ·{" "}
        {Math.round(totalWeight * 10) / 10} weighted points of recorded work
      </p>

      {error && <Notice tone="error">{error}</Notice>}

      {open ? (
        <div className="mt-6">
          <LogTaskForm
            storyId={story.id}
            taskTypes={taskTypes}
            members={members}
            currentUserId={user.id}
            canCreditOthers={editor}
          />
        </div>
      ) : (
        <Notice>
          {story.issue.name} is closed, so this story is locked.
        </Notice>
      )}

      <section className="mt-8">
        <div className="rule pb-2 mb-4 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Production history
          </h2>
          {editor && pending.length > 0 && (
            <form action={confirmAllForStoryAction}>
              <input type="hidden" name="storyId" value={story.id} />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-md bg-accent text-white text-xs hover:opacity-90 transition-opacity cursor-pointer"
              >
                Confirm all {pending.length}
              </button>
            </form>
          )}
        </div>

        {story.tasks.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing logged yet. This is the record of who actually put the story
            out — editing, fact-checking, headline, photo, layout, and the rest.
          </p>
        ) : (
          <ul className="grid gap-2">
            {story.tasks.map((task) => {
              const credited = task.credits.map((c) => c.user);
              const mine = task.credits.some((c) => c.userId === user.id);
              const split = task.credits.length > 1;

              return (
                <li
                  key={task.id}
                  className="px-4 py-3 rounded-lg border border-line bg-surface flex items-center gap-3 flex-wrap"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{task.taskType.name}</span>
                      <TaskStatusPill status={task.status} />
                      {split && (
                        <span className="text-[10px] uppercase tracking-wider text-muted">
                          split {task.credits.length} ways
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted mt-0.5">
                      {credited.map((u) => u.name).join(", ")}
                      {task.note && <span> — {task.note}</span>}
                    </div>
                    {task.confirmedBy && (
                      <div className="text-xs text-muted mt-0.5">
                        confirmed by {task.confirmedBy.name}
                      </div>
                    )}
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-sm tabular-nums text-muted">
                      {task.weight} pt{task.weight === 1 ? "" : "s"}
                    </span>

                    {open && task.status === "ASSIGNED" && (mine || editor) && (
                      <form action={completeTaskAction}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <button
                          type="submit"
                          className="px-2.5 py-1 rounded-md border border-line text-xs hover:border-accent transition-colors cursor-pointer"
                        >
                          Mark done
                        </button>
                      </form>
                    )}

                    {open && task.status === "COMPLETED" && editor && (
                      <form action={confirmTaskAction}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <button
                          type="submit"
                          className="px-2.5 py-1 rounded-md border border-accent text-accent text-xs hover:bg-accent-soft transition-colors cursor-pointer"
                        >
                          Confirm
                        </button>
                      </form>
                    )}

                    {open && (task.loggedById === user.id || editor) && (
                      <form action={deleteTaskAction}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <button
                          type="submit"
                          className="px-2 py-1 rounded-md text-xs text-muted hover:text-over transition-colors cursor-pointer"
                          title="Remove this task"
                        >
                          Remove
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function TaskStatusPill({ status }: { status: "ASSIGNED" | "COMPLETED" | "CONFIRMED" }) {
  const map = {
    ASSIGNED: { label: "assigned", cls: "border-line bg-surface-muted text-muted" },
    COMPLETED: {
      label: "unconfirmed",
      cls: "border-pending/40 bg-pending-soft text-pending",
    },
    CONFIRMED: {
      label: "confirmed",
      cls: "border-under/40 bg-under-soft text-under",
    },
  }[status];

  return (
    <span
      className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${map.cls}`}
    >
      {map.label}
    </span>
  );
}
