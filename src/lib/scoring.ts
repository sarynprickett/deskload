import { prisma } from "@/lib/prisma";

/**
 * Deskload aggregation (PLAN.md §6).
 *
 * A person's deskload is the sum of `task.weight * credit.share` over the tasks
 * they're credited on. Two totals are always kept apart:
 *   - confirmed: an editor vouched for it. This is the number that may feed real
 *     decisions (grades, promotions), so it must not be inflated by self-reports.
 *   - unconfirmed: self-logged and awaiting the confirm pass.
 * ASSIGNED tasks are work that hasn't happened yet and count toward neither.
 */

export type PersonTotals = {
  userId: string;
  name: string;
  email: string;
  role: string;
  confirmed: number;
  unconfirmed: number;
  total: number;
  taskCount: number;
  byType: { taskType: string; weighted: number; count: number }[];
};

export function startOfWeek(d: Date) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  // Monday-start weeks; newsroom cycles rarely begin on Sunday.
  const day = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - day);
  return out;
}

export function weekKey(d: Date) {
  return startOfWeek(d).toISOString().slice(0, 10);
}

type Range = { from?: Date; to?: Date };

async function loadCredits(orgId: string, range: Range = {}) {
  return prisma.taskCredit.findMany({
    where: {
      user: { orgId },
      task: {
        status: { in: ["COMPLETED", "CONFIRMED"] },
        ...(range.from || range.to
          ? { completedAt: { ...(range.from && { gte: range.from }), ...(range.to && { lte: range.to }) } }
          : {}),
      },
    },
    include: {
      user: true,
      task: { include: { taskType: true, story: { include: { issue: true } } } },
    },
  });
}

/// Cumulative scoreboard: total weighted deskload per person, broken down by task type.
export async function cumulativeScoreboard(
  orgId: string,
  range: Range = {},
): Promise<PersonTotals[]> {
  const credits = await loadCredits(orgId, range);
  const people = new Map<string, PersonTotals>();
  const typeTally = new Map<string, Map<string, { weighted: number; count: number }>>();

  for (const c of credits) {
    const weighted = c.task.weight * c.share;
    let row = people.get(c.userId);
    if (!row) {
      row = {
        userId: c.userId,
        name: c.user.name,
        email: c.user.email,
        role: c.user.role,
        confirmed: 0,
        unconfirmed: 0,
        total: 0,
        taskCount: 0,
        byType: [],
      };
      people.set(c.userId, row);
      typeTally.set(c.userId, new Map());
    }
    if (c.task.status === "CONFIRMED") row.confirmed += weighted;
    else row.unconfirmed += weighted;
    row.total += weighted;
    row.taskCount += 1;

    const types = typeTally.get(c.userId)!;
    const prev = types.get(c.task.taskType.name) ?? { weighted: 0, count: 0 };
    types.set(c.task.taskType.name, {
      weighted: prev.weighted + weighted,
      count: prev.count + 1,
    });
  }

  for (const [userId, row] of people) {
    row.byType = [...typeTally.get(userId)!.entries()]
      .map(([taskType, v]) => ({ taskType, ...v }))
      .sort((a, b) => b.weighted - a.weighted);
  }

  return [...people.values()].sort((a, b) => b.total - a.total);
}

export type WeeklyPoint = { week: string; weighted: number };
export type WorkloadFlag = {
  userId: string;
  name: string;
  email: string;
  kind: "OVERLOADED" | "HAS_CAPACITY";
  consecutiveWeeks: number;
  recent: WeeklyPoint[];
  latestWeighted: number;
};

/**
 * Weekly workload report (§6) — editors/admins only, never posted publicly (§7).
 *
 * Flags someone only after they cross a threshold for 2+ consecutive weeks, so a
 * single heavy week doesn't trigger a check-in that isn't warranted.
 */
export async function weeklyWorkload(
  orgId: string,
  opts: { weeks?: number; overload: number; underload: number },
) {
  const weeks = opts.weeks ?? 6;
  const from = startOfWeek(new Date());
  from.setDate(from.getDate() - (weeks - 1) * 7);

  const credits = await loadCredits(orgId, { from });
  const activeUsers = await prisma.user.findMany({
    where: { orgId, active: true },
    orderBy: { name: "asc" },
  });

  const weekKeys: string[] = [];
  for (let i = 0; i < weeks; i++) {
    const d = new Date(from);
    d.setDate(d.getDate() + i * 7);
    weekKeys.push(weekKey(d));
  }

  const tally = new Map<string, Map<string, number>>();
  for (const u of activeUsers) tally.set(u.id, new Map());
  for (const c of credits) {
    if (!c.task.completedAt) continue;
    const bucket = tally.get(c.userId);
    if (!bucket) continue;
    const k = weekKey(c.task.completedAt);
    bucket.set(k, (bucket.get(k) ?? 0) + c.task.weight * c.share);
  }

  const series = activeUsers.map((u) => {
    const bucket = tally.get(u.id)!;
    const recent: WeeklyPoint[] = weekKeys.map((week) => ({
      week,
      weighted: Math.round((bucket.get(week) ?? 0) * 10) / 10,
    }));
    return { user: u, recent };
  });

  // Count the streak ending at the most recently *completed* week. The current
  // week is still in progress, so counting it would flag everyone as underloaded
  // every Monday morning.
  const flags: WorkloadFlag[] = [];
  for (const { user, recent } of series) {
    const settled = recent.slice(0, -1);
    if (settled.length === 0) continue;

    const trailingStreak = (pred: (w: WeeklyPoint) => boolean) => {
      let n = 0;
      for (let i = settled.length - 1; i >= 0; i--) {
        if (pred(settled[i]!)) n++;
        else break;
      }
      return n;
    };

    const over = trailingStreak((w) => w.weighted > opts.overload);
    const under = trailingStreak((w) => w.weighted < opts.underload);
    const latest = settled[settled.length - 1]!.weighted;

    if (over >= 2) {
      flags.push({
        userId: user.id,
        name: user.name,
        email: user.email,
        kind: "OVERLOADED",
        consecutiveWeeks: over,
        recent,
        latestWeighted: latest,
      });
    } else if (under >= 2) {
      flags.push({
        userId: user.id,
        name: user.name,
        email: user.email,
        kind: "HAS_CAPACITY",
        consecutiveWeeks: under,
        recent,
        latestWeighted: latest,
      });
    }
  }

  return { weekKeys, series, flags };
}
