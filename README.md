# Deskload

Deskload records the full production history of every story — not just the byline — so newsrooms can see who's actually holding the issue together, before that person burns out and quits, as well as who needs more work on their desk load.

## The problem

Bylines answer "who wrote this." They say nothing about who edited it three times, who fact-checked the quotes at midnight, who wrote the headline, who pulled and cropped the photo, or who laid out the page. In a student paper or small newsroom that second category is most of the work — and it's structurally invisible. It isn't tracked, so it isn't remembered, so it can't be rewarded or redistributed before it breaks someone.

The full product plan — problem framing, task taxonomy, workflows, scoreboard design, anti-gaming decisions, MVP scope, and roadmap — is in [PLAN.md](PLAN.md). Section numbers below refer to it.

## What's built

This is the §8 MVP.

- **Orgs, users, roles** — admin / editor / staff, invite-first
- **Issues → Stories → Tasks** — tasks are an open checklist on a story, not a fixed pipeline
- **Editable task taxonomy and weights** — so a 20-second headline swap doesn't count the same as a 45-minute fact-check
- **Self-log + editor confirm** — anyone logs their own work instantly; it reads as *unconfirmed* until an editor vouches for it, in one bulk pass per story
- **Split credit** — two people can share one task; the weight divides between them
- **Cumulative scoreboard** — weighted deskload per person, broken down by task type, confirmed counted separately from unconfirmed
- **Weekly workload report** — private to editors; flags people over or under threshold for 2+ consecutive weeks

### Design decisions carried over from the plan

These are deliberate and worth not re-litigating (§7, §11):

- The weekly over/underload report is **editor-only and never posted publicly**.
- Masthead-wide scoreboard visibility is **opt-in per newsroom, off by default**.
- Anyone can log a task for themselves; **only editors can credit someone else**.
- Changing a task type's weight affects **new tasks only** — logged work keeps the weight it had, so re-weighting never silently rewrites history.
- Closing an issue **locks** its stories and tasks.

## Running it locally

Requires Node 20.9+ and PostgreSQL.

```bash
brew install node postgresql@16
brew services start postgresql@16
createdb deskload_dev
```

Then:

```bash
npm install
cp .env.example .env     # set DATABASE_URL and AUTH_SECRET
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000. With `DEV_LOGIN=1` the sign-in page is a no-password user switcher — click any seeded name. Sign in as **Maya Ortiz** (admin) to see everything, or **Sam Whitfield** (staff) to see the staff-side view.

The seed creates a fictional newsroom, *The Campus Ledger*, deliberately shaped so one person is quietly carrying the paper — which is the situation the whole product exists to surface. Clear it before real use.

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build (runs `prisma generate` first) |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:seed` | Reset and reseed sample data |
| `npm run db:studio` | Browse the database |
| `npm run db:reset` | Drop, re-migrate, reseed |

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions) + TypeScript
- **Prisma 7** with the `@prisma/adapter-pg` driver adapter
- **PostgreSQL**
- **Tailwind 4**

## Deploying to Vercel

Not yet deployed. When you're ready:

1. Create a Postgres database (Neon or Supabase free tier is plenty at this scale) and copy its connection string.
2. Import this repo in Vercel.
3. Set environment variables: `DATABASE_URL`, and `AUTH_SECRET` (generate with `openssl rand -base64 32`). **Leave `DEV_LOGIN` unset** — the dev user switcher is also hard-disabled whenever `NODE_ENV=production`, but don't rely on only one of those.
4. Run `npm run db:deploy` against the production database to apply migrations.

The build command already runs `prisma generate`, which is required because the generated client is gitignored.

## Authentication status

Sign-in currently has one implementation: a **local development user switcher**, gated behind `DEV_LOGIN=1` *and* `NODE_ENV !== "production"`.

**Google OAuth is not wired up yet.** It is the one piece of §8 that isn't built, because it can't be exercised locally without a Google Cloud OAuth client. The seam for it is deliberately small: `getCurrentUser()` in [src/lib/auth.ts](src/lib/auth.ts) is the only place that resolves a session into a user, and every permission helper sits behind it. Adding a provider means changing where the user id comes from — the invite-first lookup, the role checks, and every page stay as they are.

Because Deskload is invite-first, OAuth should reject any email that isn't already on the masthead rather than auto-creating accounts.

## Where to go next

Per §12, the two flows that carry all the adoption risk — creating a story and logging/confirming a task — are built and working. The plan's §0 step is still worth doing before building further: talk to a few people across a couple of newsrooms about whether they'd actually log tasks, and what "too much friction" looks like to them.
