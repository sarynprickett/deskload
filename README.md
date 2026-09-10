# Deskload

Deskload records the full production history of every story — not just the byline — so newsrooms can see who's actually holding the issue together, before that person burns out and quits, as well as who needs more work on their desk load.

## The problem

Bylines answer "who wrote this." They say nothing about who edited it three times, who fact-checked the quotes at midnight, who wrote the headline, who pulled and cropped the photo, or who laid out the page. In a student paper or small newsroom that second category is most of the work — and it's structurally invisible. It isn't tracked, so it isn't remembered, so it can't be rewarded or redistributed before it breaks someone.

## Core concept

A story accumulates **tasks**, and every task credits a person. The sum of a person's credited tasks over time is their **deskload**.

- **Story** belongs to an **Issue** (or publish cycle)
- **Tasks** attach to a story as an open checklist — not a rigid pipeline, because newsrooms work in parallel and out of order
- Each **task type** (editing, fact-checking, headline, photo pull, copyedit, layout, social…) carries an editable weight
- Tasks are self-logged instantly, then confirmed by an editor in a single bulk pass at issue close

## Status

Pre-implementation. The full product plan — problem framing, task taxonomy, workflows, scoreboard design, anti-gaming decisions, MVP scope, schema, and roadmap — lives in [PLAN.md](PLAN.md).

## Planned stack

- **App:** Next.js (React + TypeScript), single codebase
- **Database:** Postgres via Prisma (SQLite for local dev)
- **Auth:** NextAuth — Google OAuth (campus emails) or magic link
- **Hosting:** Vercel + managed Postgres (Neon/Supabase)

## Design tenet

Deskload is a workload-balancing and recognition tool, **not** a productivity leaderboard. Overload/underload flags go to editors privately, never posted publicly; masthead-wide scoreboard visibility is opt-in per newsroom and off by default.
