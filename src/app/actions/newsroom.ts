"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { canCreditOthers, isEditor, requireAdmin, requireEditor, requireUser } from "@/lib/auth";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/// Ensures the record belongs to the signed-in user's newsroom before touching it.
async function assertSameOrg(orgId: string, targetOrgId: string) {
  if (orgId !== targetOrgId) throw new Error("Not found in your newsroom.");
}

const issueSchema = z.object({
  name: z.string().trim().min(1, "Give the issue a name.").max(120),
  cycleStart: z.string().min(1),
  cycleEnd: z.string().min(1),
});

export async function createIssueAction(formData: FormData) {
  const user = await requireEditor();
  const parsed = issueSchema.safeParse({
    name: formData.get("name"),
    cycleStart: formData.get("cycleStart"),
    cycleEnd: formData.get("cycleEnd"),
  });
  if (!parsed.success) {
    redirect(`/issues?error=${encodeURIComponent(parsed.error.issues[0]!.message)}`);
  }

  const issue = await prisma.issue.create({
    data: {
      orgId: user.orgId,
      name: parsed.data.name,
      cycleStart: new Date(parsed.data.cycleStart),
      cycleEnd: new Date(parsed.data.cycleEnd),
    },
  });

  revalidatePath("/issues");
  revalidatePath("/");
  redirect(`/issues/${issue.id}`);
}

/// §5: closing an issue locks its stories and tasks. This is the natural moment
/// to run the confirm pass, so we do not auto-confirm anything here.
export async function setIssueStatusAction(formData: FormData) {
  const user = await requireEditor();
  const issueId = String(formData.get("issueId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (status !== "OPEN" && status !== "CLOSED") throw new Error("Bad status.");

  const issue = await prisma.issue.findUnique({ where: { id: issueId } });
  if (!issue) throw new Error("Issue not found.");
  await assertSameOrg(user.orgId, issue.orgId);

  await prisma.issue.update({ where: { id: issueId }, data: { status } });
  revalidatePath(`/issues/${issueId}`);
  revalidatePath("/issues");
  revalidatePath("/");
}

export async function createStoryAction(formData: FormData) {
  const user = await requireUser();
  const issueId = String(formData.get("issueId") ?? "");
  const title = String(formData.get("title") ?? "").trim();

  if (!title) {
    redirect(`/issues/${issueId}?error=${encodeURIComponent("Give the story a title.")}`);
  }

  const issue = await prisma.issue.findUnique({ where: { id: issueId } });
  if (!issue) throw new Error("Issue not found.");
  await assertSameOrg(user.orgId, issue.orgId);
  if (issue.status === "CLOSED") {
    redirect(`/issues/${issueId}?error=${encodeURIComponent("That issue is closed.")}`);
  }

  // Slugs are unique per issue; disambiguate rather than rejecting the story.
  const base = slugify(title) || "story";
  let slug = base;
  for (let i = 2; await prisma.story.findFirst({ where: { issueId, slug } }); i++) {
    slug = `${base}-${i}`;
  }

  const story = await prisma.story.create({ data: { issueId, title, slug } });
  revalidatePath(`/issues/${issueId}`);
  redirect(`/stories/${story.id}`);
}

/**
 * Logging a task (§5). Two entry points share this action:
 *   - self-log: credit yourself, status COMPLETED, awaiting an editor's confirm
 *   - assign: an editor hands work to someone; status ASSIGNED until they finish
 *
 * §11: anyone may log for themselves, only editors may credit someone else.
 */
export async function logTaskAction(formData: FormData) {
  const user = await requireUser();
  const storyId = String(formData.get("storyId") ?? "");
  const taskTypeId = String(formData.get("taskTypeId") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const mode = String(formData.get("mode") ?? "log");
  const creditedIds = formData.getAll("creditedUserIds").map(String).filter(Boolean);

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: { issue: true },
  });
  if (!story) throw new Error("Story not found.");
  await assertSameOrg(user.orgId, story.issue.orgId);

  const fail = (msg: string) =>
    redirect(`/stories/${storyId}?error=${encodeURIComponent(msg)}`);

  if (story.issue.status === "CLOSED") fail("That issue is closed — reopen it to log work.");

  const taskType = await prisma.taskType.findUnique({ where: { id: taskTypeId } });
  if (!taskType || taskType.orgId !== user.orgId) fail("Pick a task type.");

  const credited = creditedIds.length > 0 ? creditedIds : [user.id];
  const creditsOthers = credited.some((id) => id !== user.id);
  if (creditsOthers && !canCreditOthers(user.role)) {
    fail("Only editors can credit someone else. You can log this for yourself.");
  }

  const members = await prisma.user.findMany({
    where: { id: { in: credited }, orgId: user.orgId, active: true },
  });
  if (members.length !== credited.length) fail("Pick who should get credit.");

  await prisma.task.create({
    data: {
      storyId,
      taskTypeId,
      weight: taskType!.defaultWeight,
      status: mode === "assign" ? "ASSIGNED" : "COMPLETED",
      completedAt: mode === "assign" ? null : new Date(),
      note,
      loggedById: user.id,
      credits: {
        create: members.map((m) => ({ userId: m.id, share: 1 / members.length })),
      },
    },
  });

  revalidatePath(`/stories/${storyId}`);
  revalidatePath("/scoreboard");
  revalidatePath("/");
}

/// Marks assigned work as done. The person credited (or an editor) can do this.
export async function completeTaskAction(formData: FormData) {
  const user = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { credits: true, story: { include: { issue: true } } },
  });
  if (!task) throw new Error("Task not found.");
  await assertSameOrg(user.orgId, task.story.issue.orgId);

  const isCredited = task.credits.some((c) => c.userId === user.id);
  if (!isCredited && !isEditor(user.role)) {
    redirect(
      `/stories/${task.storyId}?error=${encodeURIComponent("That task is credited to someone else.")}`,
    );
  }

  await prisma.task.update({
    where: { id: taskId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  revalidatePath(`/stories/${task.storyId}`);
  revalidatePath("/");
}

/**
 * The trust layer (§5): a single tap by an editor, designed to be done in bulk
 * at story close rather than per task.
 */
export async function confirmTaskAction(formData: FormData) {
  const user = await requireEditor();
  const taskId = String(formData.get("taskId") ?? "");

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { story: { include: { issue: true } } },
  });
  if (!task) throw new Error("Task not found.");
  await assertSameOrg(user.orgId, task.story.issue.orgId);

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status: "CONFIRMED",
      confirmedById: user.id,
      confirmedAt: new Date(),
      completedAt: task.completedAt ?? new Date(),
    },
  });
  revalidatePath(`/stories/${task.storyId}`);
  revalidatePath("/scoreboard");
  revalidatePath("/");
}

export async function confirmAllForStoryAction(formData: FormData) {
  const user = await requireEditor();
  const storyId = String(formData.get("storyId") ?? "");

  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: { issue: true },
  });
  if (!story) throw new Error("Story not found.");
  await assertSameOrg(user.orgId, story.issue.orgId);

  const now = new Date();
  await prisma.task.updateMany({
    where: { storyId, status: "COMPLETED" },
    data: { status: "CONFIRMED", confirmedById: user.id, confirmedAt: now },
  });

  revalidatePath(`/stories/${storyId}`);
  revalidatePath("/scoreboard");
  revalidatePath("/");
}

export async function deleteTaskAction(formData: FormData) {
  const user = await requireUser();
  const taskId = String(formData.get("taskId") ?? "");

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { story: { include: { issue: true } } },
  });
  if (!task) throw new Error("Task not found.");
  await assertSameOrg(user.orgId, task.story.issue.orgId);

  // You can remove what you logged; editors can remove anything in their newsroom.
  if (task.loggedById !== user.id && !isEditor(user.role)) {
    redirect(
      `/stories/${task.storyId}?error=${encodeURIComponent("Only the person who logged it, or an editor, can remove a task.")}`,
    );
  }

  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath(`/stories/${task.storyId}`);
  revalidatePath("/scoreboard");
  revalidatePath("/");
}

const settingsSchema = z.object({
  overloadThreshold: z.coerce.number().min(0).max(1000),
  underloadThreshold: z.coerce.number().min(0).max(1000),
  scoreboardVisibility: z.enum(["PRIVATE", "MASTHEAD"]),
});

export async function updateOrgSettingsAction(formData: FormData) {
  const user = await requireAdmin();
  const parsed = settingsSchema.safeParse({
    overloadThreshold: formData.get("overloadThreshold"),
    underloadThreshold: formData.get("underloadThreshold"),
    scoreboardVisibility: formData.get("scoreboardVisibility"),
  });
  if (!parsed.success) {
    redirect(`/settings?error=${encodeURIComponent(parsed.error.issues[0]!.message)}`);
  }
  if (parsed.data.underloadThreshold >= parsed.data.overloadThreshold) {
    redirect(
      `/settings?error=${encodeURIComponent("The capacity threshold must be below the overload threshold.")}`,
    );
  }

  await prisma.organization.update({
    where: { id: user.orgId },
    data: parsed.data,
  });
  revalidatePath("/settings");
  revalidatePath("/reports/weekly");
  redirect("/settings?saved=1");
}

export async function upsertTaskTypeAction(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const weight = Number(formData.get("defaultWeight"));

  if (!name || !Number.isFinite(weight) || weight < 0) {
    redirect(`/settings?error=${encodeURIComponent("Task types need a name and a weight of 0 or more.")}`);
  }

  if (id) {
    const existing = await prisma.taskType.findUnique({ where: { id } });
    if (!existing || existing.orgId !== user.orgId) throw new Error("Task type not found.");
    // Only new tasks pick up the new weight — Task.weight is snapshotted at log time.
    await prisma.taskType.update({
      where: { id },
      data: { name, defaultWeight: weight },
    });
  } else {
    const clash = await prisma.taskType.findFirst({
      where: { orgId: user.orgId, name },
    });
    if (clash) {
      redirect(`/settings?error=${encodeURIComponent("You already have a task type with that name.")}`);
    }
    const count = await prisma.taskType.count({ where: { orgId: user.orgId } });
    await prisma.taskType.create({
      data: { orgId: user.orgId, name, defaultWeight: weight, sortOrder: count + 1 },
    });
  }

  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export async function setTaskTypeArchivedAction(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const archived = String(formData.get("archived") ?? "") === "1";

  const existing = await prisma.taskType.findUnique({ where: { id } });
  if (!existing || existing.orgId !== user.orgId) throw new Error("Task type not found.");

  await prisma.taskType.update({ where: { id }, data: { archived } });
  revalidatePath("/settings");
}

export async function addUserAction(formData: FormData) {
  const user = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "STAFF");

  if (!name || !z.email().safeParse(email).success) {
    redirect(`/settings?error=${encodeURIComponent("A name and a valid email are required.")}`);
  }
  if (!["ADMIN", "EDITOR", "STAFF"].includes(role)) throw new Error("Bad role.");

  const clash = await prisma.user.findUnique({ where: { email } });
  if (clash) {
    redirect(`/settings?error=${encodeURIComponent("Someone with that email is already on the masthead.")}`);
  }

  await prisma.user.create({
    data: { orgId: user.orgId, name, email, role: role as "ADMIN" | "EDITOR" | "STAFF" },
  });
  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export async function setUserActiveAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active") ?? "") === "1";

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target || target.orgId !== admin.orgId) throw new Error("User not found.");
  if (target.id === admin.id) {
    redirect(`/settings?error=${encodeURIComponent("You can't deactivate yourself.")}`);
  }

  await prisma.user.update({ where: { id }, data: { active } });
  revalidatePath("/settings");
}
