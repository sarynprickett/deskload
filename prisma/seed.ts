import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

// Deterministic RNG so re-seeding produces the same newsroom.
let rngState = 20260910;
function rand() {
  rngState = (rngState * 1664525 + 1013904223) % 4294967296;
  return rngState / 4294967296;
}
function pick<T>(items: T[]): T {
  return items[Math.floor(rand() * items.length)]!;
}
function chance(p: number) {
  return rand() < p;
}

function daysAgo(n: number, hour = 20) {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

// §4 default taxonomy. Weights (§6) exist so a 20-second headline swap doesn't
// count the same as a 45-minute fact-check.
const TASK_TYPES = [
  { name: "Reporting / writing", defaultWeight: 5, sortOrder: 1 },
  { name: "Editing", defaultWeight: 3, sortOrder: 2 },
  { name: "Fact-checking", defaultWeight: 3, sortOrder: 3 },
  { name: "Headline writing", defaultWeight: 1, sortOrder: 4 },
  { name: "Photo pull / editing", defaultWeight: 2, sortOrder: 5 },
  { name: "Copyediting / proofing", defaultWeight: 2, sortOrder: 6 },
  { name: "Layout / design", defaultWeight: 3, sortOrder: 7 },
  { name: "Social / promotion", defaultWeight: 1, sortOrder: 8 },
  { name: "Translation", defaultWeight: 3, sortOrder: 9 },
  { name: "Other", defaultWeight: 1, sortOrder: 10 },
];

const PEOPLE = [
  { name: "Maya Ortiz", email: "maya@thecampusledger.example", role: "ADMIN" },
  { name: "Devon Brooks", email: "devon@thecampusledger.example", role: "EDITOR" },
  { name: "Priya Raman", email: "priya@thecampusledger.example", role: "EDITOR" },
  { name: "Sam Whitfield", email: "sam@thecampusledger.example", role: "STAFF" },
  { name: "Alex Chen", email: "alex@thecampusledger.example", role: "STAFF" },
  { name: "Jordan Blake", email: "jordan@thecampusledger.example", role: "STAFF" },
  { name: "Riley Nakamura", email: "riley@thecampusledger.example", role: "STAFF" },
  { name: "Casey Moore", email: "casey@thecampusledger.example", role: "STAFF" },
] as const;

const STORY_TITLES = [
  "Provost defends tuition increase at packed forum",
  "Housing lottery leaves 200 sophomores unplaced",
  "Men's basketball ends 12-year tournament drought",
  "Inside the campus food pantry's record semester",
  "Faculty senate votes no confidence in dean",
  "New dining contract quietly drops late-night hours",
  "Student government spent $40k on a concert nobody attended",
  "Library cuts 24-hour access, citing staffing",
  "Profile: the groundskeeper who's been here 41 years",
  "Campus shuttle routes redrawn after two near-misses",
  "Grad workers file for union election",
  "Chemistry building renovation delayed a third time",
  "Opinion: the meal plan math doesn't work",
  "Photo essay: move-in day, 6 a.m. to midnight",
  "Athletics quietly raised student fees to cover deficit",
  "Whatever happened to the bike share program?",
];

async function main() {
  console.log("Resetting Deskload seed data...");
  await prisma.taskCredit.deleteMany();
  await prisma.task.deleteMany();
  await prisma.story.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.taskType.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: {
      name: "The Campus Ledger",
      slug: "campus-ledger",
      // §7: private by default. Masthead-wide is opt-in.
      scoreboardVisibility: "PRIVATE",
      overloadThreshold: 20,
      underloadThreshold: 4,
    },
  });

  const users: Awaited<ReturnType<typeof prisma.user.create>>[] = [];
  for (const p of PEOPLE) {
    users.push(
      await prisma.user.create({
        data: { orgId: org.id, name: p.name, email: p.email, role: p.role },
      }),
    );
  }
  const byEmail = (e: string) => users.find((u) => u.email.startsWith(e))!;

  const taskTypes: Awaited<ReturnType<typeof prisma.taskType.create>>[] = [];
  for (const t of TASK_TYPES) {
    taskTypes.push(await prisma.taskType.create({ data: { orgId: org.id, ...t } }));
  }
  const type = (name: string) => taskTypes.find((t) => t.name === name)!;

  const editors = users.filter((u) => u.role !== "STAFF");
  const writers = users.filter((u) => u.role === "STAFF");

  // Sam is the person the whole product exists to find: absorbing the
  // uncredited desk work every week. Jordan has visible capacity.
  const sam = byEmail("sam");
  const jordan = byEmail("jordan");
  const deskPool = [sam, sam, sam, byEmail("alex"), byEmail("riley"), byEmail("casey")];

  const issues = [
    { name: "Vol. 118, Issue 5", weeksAgo: 4, status: "CLOSED" as const },
    { name: "Vol. 118, Issue 6", weeksAgo: 3, status: "CLOSED" as const },
    { name: "Vol. 118, Issue 7", weeksAgo: 2, status: "CLOSED" as const },
    { name: "Vol. 118, Issue 8", weeksAgo: 1, status: "CLOSED" as const },
    { name: "Vol. 118, Issue 9", weeksAgo: 0, status: "OPEN" as const },
  ];

  let titleCursor = 0;
  let taskCount = 0;

  for (const spec of issues) {
    const start = daysAgo(spec.weeksAgo * 7 + 6, 9);
    const end = daysAgo(spec.weeksAgo * 7, 23);
    const issue = await prisma.issue.create({
      data: {
        orgId: org.id,
        name: spec.name,
        cycleStart: start,
        cycleEnd: end,
        status: spec.status,
      },
    });

    const storyCount = 3;
    for (let s = 0; s < storyCount; s++) {
      const title = STORY_TITLES[titleCursor % STORY_TITLES.length]!;
      titleCursor++;
      const story = await prisma.story.create({
        data: { issueId: issue.id, title, slug: slugify(title) },
      });

      const writer = pick(writers);
      const plan: { typeName: string; who: (typeof users)[number][] }[] = [
        { typeName: "Reporting / writing", who: [writer] },
        { typeName: "Editing", who: [pick(editors)] },
        { typeName: "Fact-checking", who: [pick(deskPool)] },
        { typeName: "Headline writing", who: [pick(deskPool)] },
        { typeName: "Photo pull / editing", who: [pick(deskPool)] },
        { typeName: "Copyediting / proofing", who: [sam] },
        { typeName: "Layout / design", who: [pick(deskPool)] },
        { typeName: "Social / promotion", who: [pick(deskPool)] },
      ];

      // A second editing round on some stories — real editing is rarely one pass.
      if (chance(0.4)) plan.push({ typeName: "Editing", who: [pick(editors)] });
      // Demonstrate split credit (§11): two people co-fact-check.
      if (chance(0.3)) {
        plan.push({ typeName: "Fact-checking", who: [sam, byEmail("alex")] });
      }
      // Jordan appears rarely — that's the point.
      if (chance(0.2)) plan.push({ typeName: "Social / promotion", who: [jordan] });

      for (const item of plan) {
        const tt = type(item.typeName);
        const completedAt = new Date(
          start.getTime() + rand() * (end.getTime() - start.getTime()),
        );

        let status: "ASSIGNED" | "COMPLETED" | "CONFIRMED";
        if (spec.status === "CLOSED") {
          status = "CONFIRMED";
        } else if (chance(0.2)) {
          status = "ASSIGNED";
        } else if (chance(0.5)) {
          status = "CONFIRMED";
        } else {
          status = "COMPLETED";
        }

        const confirmer = pick(editors);
        await prisma.task.create({
          data: {
            storyId: story.id,
            taskTypeId: tt.id,
            weight: tt.defaultWeight,
            status,
            completedAt: status === "ASSIGNED" ? null : completedAt,
            loggedById: item.who[0]!.id,
            confirmedById: status === "CONFIRMED" ? confirmer.id : null,
            confirmedAt: status === "CONFIRMED" ? completedAt : null,
            credits: {
              create: item.who.map((u) => ({
                userId: u.id,
                share: 1 / item.who.length,
              })),
            },
          },
        });
        taskCount++;
      }
    }
  }

  console.log(`Seeded ${users.length} people, ${issues.length} issues, ${taskCount} tasks.`);
  console.log(`Sign in locally as any of: ${PEOPLE.map((p) => p.email).join(", ")}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
