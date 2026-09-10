*Deskload Agenda Scraper, API version

The end goal of this app is to have a set of scrapers that obtains and tracks information of who actually does the work of putting out a publication (editing, fact-checking, headline writing, photo pulls) and shows the newsroom the real distribution between all of the different people who help carry out a story. 
Deskload — Product Plan

One-line pitch: Deskload records the full production history of every story — not just the byline — so newsrooms can see who's actually holding the issue together, before that person burns out and quits, as well as who needs to put more work on their desk load. 

1. The problem, sharpened

Bylines answer "who wrote this." They say nothing about who edited it three times, who fact-checked the quotes at midnight, who wrote the headline that actually got the click, who pulled and cropped the photo, or who laid out the page when the designer no-showed. In a student paper or small newsroom, that second category of work is most of the work — and it's structurally invisible. It isn't tracked anywhere, so it isn't remembered, so it can't be rewarded, and it can't be redistributed before it breaks someone.

The failure mode this produces is specific: one or two people quietly absorb the slack every week, nobody notices because there's no record to notice from, and the organization only learns who was load-bearing when that person burns out and leaves. Deskload's job is to make that visible while it's still fixable, not in the exit interview.

2. Who this is for
Role	What they want from Deskload
Editor-in-chief / managing editor	A real basis for promotions, awards, and course-credit sign-off; an early warning system for burnout on their masthead
Section / desk editors	A way to see who on their desk is actually available vs. slammed before handing out the next assignment
Staff writers, copy editors, photo editors, designers	Recognition for work that never shows up in a byline; proof of contribution for portfolios, resumes, and credit hours
Faculty advisor (student papers)	Defensible, non-anecdotal evidence for grades/credit and for flagging a student in distress

Design tenet that follows from this: Deskload is a workload-balancing and recognition tool, not a productivity leaderboard. If it starts to feel like a public ranking that people get shamed by, it will get gamed or abandoned. That has to be designed against from the start, not patched in later — see §7.

3. Core concept

Everything in Deskload hangs off one idea: a story accumulates tasks, and every task has exactly one person who is credited for it.

A Story belongs to an Issue (or a publish cycle — some outlets are issue-based, some are rolling/online).
A story has a checklist of Tasks, each with a type (writing, editing, fact-checking, headline, photo pull/edit, copyedit, layout/design, social/promo — see §4 for the full taxonomy, which should be editable per newsroom).
Tasks are not a rigid linear pipeline. Real newsrooms do headline writing, photo pulls, and copyediting in parallel, sometimes out of order, sometimes redone twice. Deskload models tasks as an open checklist attached to a story, not a fixed workflow state machine. This is an important divergence from most "workflow" tools and should not get re-litigated later — a strict pipeline will fight how newsrooms actually work.
Completing a task credits a person (or people — task-splitting matters; two people can share a fact-check).
The sum of a person's credited tasks, over time, is their deskload.
4. Task taxonomy (starting default — must be editable per newsroom)
Task type	Notes
Reporting / writing	The byline work — already visible, included for completeness
Editing (line edit / structural edit)	Often multiple rounds, often multiple editors
Fact-checking	Frequently uncredited entirely today
Headline writing	Often done by whoever's on the desk, not the writer
Photo pull / selection / editing	Distinct from photography — this is picking and prepping the art
Copyediting / proofing	Last-pass grammar/style/AP-style pass
Layout / design	Page or web layout
Social / promotion	Writing the tweet, the Instagram caption, the newsletter blurb
Translation	If applicable
Other (custom)	Newsroom-defined catch-all

Each task type gets a weight (see §6) so a 20-second headline swap doesn't count the same as a 45-minute fact-check. Weights should be editable by admins, with sane defaults shipped.

5. Core workflows

Creating a story. Someone (writer, editor, or admin) creates a Story inside an Issue, gives it a title/slug, and it's now a place tasks attach to. This should take under 10 seconds — a name and an issue is enough to start.

Logging a task. This is the crux of adoption, so it has to be nearly frictionless. Two entry points, both should exist:

Self-log: "I just did the headline for this story" — one tap, pick the story, pick the task type, done.
Assign-and-complete: An editor assigns "fact-check" to a specific person when handing off; that person marks it done when finished.

Trust / anti-gaming layer. Pure self-reported credit is gameable and, more importantly, won't be trusted by editors making promotion decisions off of it. The lightest-weight fix that preserves speed: a task can be self-logged instantly, but shows as "unconfirmed" until the story's owning editor (or any editor) taps to confirm — a single tap, done in bulk at story-close time, not per task. This gives you an audit trail without turning every task into an approval workflow.

Issue close-out. When an issue publishes, its stories and tasks lock. This is the natural moment to run the confirm-pass and to snapshot that issue's numbers into the scoreboard.

6. Scoreboard

Two distinct views, because they serve different purposes and different audiences:

Cumulative scoreboard (per person, across a cycle/semester): total weighted deskload, broken down by task type. This is the artifact an editor hands to a promotion committee or a faculty advisor for course credit — "here is the actual, recorded distribution of labor," not a vibe. Recommend this be visible to the person themselves and to editors/admins by default, with a masthead-wide visible toggle that's opt-in per newsroom (some will want full transparency, some won't, and forcing it risks the leaderboard-shaming failure mode from §2).
Weekly workload report, visible to editors/admins only: flags people trending above a configurable threshold for 2+ consecutive weeks ("carrying too much — check in") and people trending near zero ("has capacity — safe to assign more"). This is explicitly a private management signal, not a public list, so it can flag someone as overloaded without also broadcasting that they're underloaded, or vice versa — either one made public undermines trust in the tool.

Weighting default: start with a simple point value per task type (editable), sum weighted points per person per week/cycle. Don't build time-tracking (self-reported minutes) into v1 — it's more friction for marginal accuracy gain over a decent default weight table.

7. Designing against the toxic-scoreboard failure mode

Because the explicit goal is catching burnout, not ranking people, a few decisions should be locked in early rather than left to "we'll see":

Weekly overload/underload flags go to editors/admins, never posted publicly.
The cumulative scoreboard's masthead-wide visibility is opt-in per newsroom, off by default.
Framing in the UI matters: "deskload" as a neutral capacity measure ("here's what's on your desk"), not a score to maximize. Avoid streaks, badges-as-competition, or anything that rewards logging volume over accuracy.
Confirmation step (§5) exists so the numbers editors act on are trustworthy, which matters more here than in a typical gamified app, because these numbers may feed real decisions (grades, promotions).
8. MVP scope (v1) — what to build first

In scope:

Orgs/newsrooms, users, roles (admin/editor, staff)
Issues, Stories, Tasks (with editable task-type taxonomy + weights)
Self-log + editor-confirm flow
Cumulative scoreboard per person per cycle
Weekly workload flag report (over/under threshold) for editors
Simple auth (magic link or Google OAuth — campus email domains make Google OAuth easy)

Explicitly out of scope for v1 (roadmap items, §9):

Integrations with Slack, Google Docs, CMS/WordPress, Trello/Asana
Time-tracking / minute-level logging
Native mobile app (a responsive web app is enough at this scale)
Public masthead-wide leaderboard UI (build the toggle later once the private version is trusted)
Multi-newsroom / cross-org analytics

Keeping v1 this narrow matters more than usual here: the entire value proposition depends on people actually logging tasks, and every bit of friction you add before proving that habit sticks is a reason for someone to stop.

9. Suggested build approach (given you're building this with a coding agent)

This is a small-data, CRUD-shaped app with a couple of aggregation views — a good fit for a straightforward full-stack setup a coding agent can scaffold cleanly and you can extend by hand:

Frontend/backend: Next.js (React + TypeScript), single app, server components/API routes for the backend logic. Keeps one codebase, one deploy.
Database: Postgres via Prisma (or SQLite via Prisma for local dev/very small newsrooms — trivial to swap later since Prisma abstracts it).
Auth: NextAuth with Google OAuth (campus emails) or magic-link email — avoid building your own password auth.
Hosting: Vercel (frontend/API) + a managed Postgres (Neon/Supabase free tier is plenty at this scale).
Minimal starting schema:
Organization(id, name)
User(id, org_id, name, email, role)          -- role: admin | editor | staff
Issue(id, org_id, name, cycle_start, cycle_end, status)
Story(id, issue_id, title, slug)
TaskType(id, org_id, name, default_weight)
Task(id, story_id, task_type_id, credited_user_id, weight, status, logged_by, confirmed_by, created_at)

That's enough to build Story creation, task logging/confirmation, and both scoreboard views. Everything else (weekly digest emails, integrations) layers on top without schema upheaval.

10. Roadmap
Phase	Focus
0 — Validate	Talk to 3–5 people across 2–3 newsrooms (including non-editors) about whether they'd actually log tasks, and what "too much friction" looks like to them
1 — MVP	§8's in-scope list
2 — Habit-forming	Weekly email/Slack digest of "your deskload this week"; make logging possible from wherever people already work (e.g. a Slack shortcut)
3 — Integrations	Slack app, Google Docs sidebar or comment-triggered logging, CMS webhook (if the paper publishes via WordPress/SNworks etc.)
4 — Institutional features	Semester export formatted for advisor sign-off / course credit; multi-issue trend views for promotion committees
5 — Recognition layer	Non-competitive "thank you" / shout-out mechanism tied to logged tasks, once trust in the core data is established
11. Open questions worth deciding before you start building
Visibility default: private-to-self-and-editors, or masthead-wide from day one? (Plan above recommends private-by-default, opt-in wide.)
Multi-credit tasks: can two people split credit for one task (e.g., co-fact-checking), or does every task need exactly one owner? Recommend allowing a split from day one — it's a small schema change now, an annoying migration later.
Who can log a task on someone else's behalf? Only editors, or anyone? Recommend: anyone can log for themselves; only editors/admins can log/assign on someone else's behalf, to avoid credit disputes.
Single newsroom vs. multi-tenant SaaS: are you building this for your own paper first, or as something other papers could sign up for later? Doesn't change v1 much (Organization as a top-level entity handles both), but affects how much you invest in onboarding/self-serve signup early.
12. Suggested next step

Build §9's schema and the two core flows first — creating a story and logging/confirming a task — before touching the scoreboard or reports. Those two flows are where all the adoption risk lives; the aggregation views are comparatively easy once the underlying task data exists.
