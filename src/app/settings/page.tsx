import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  addUserAction,
  setTaskTypeArchivedAction,
  setUserActiveAction,
  updateOrgSettingsAction,
  upsertTaskTypeAction,
} from "@/app/actions/newsroom";
import { Notice } from "@/components/notice";

export default async function SettingsPage({
  searchParams,
}: PageProps<"/settings">) {
  const user = await requireAdmin();
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const saved = sp.saved === "1";

  const [taskTypes, members] = await Promise.all([
    prisma.taskType.findMany({
      where: { orgId: user.orgId },
      orderBy: [{ archived: "asc" }, { sortOrder: "asc" }],
    }),
    prisma.user.findMany({
      where: { orgId: user.orgId },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    }),
  ]);

  return (
    <div>
      <h1 className="display text-3xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-2 text-muted">{user.org.name}</p>

      {error && <Notice tone="error">{error}</Notice>}
      {saved && !error && <Notice tone="success">Saved.</Notice>}

      <section className="mt-8">
        <div className="rule pb-2 mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Visibility and thresholds
          </h2>
        </div>

        <form
          action={updateOrgSettingsAction}
          className="p-4 rounded-lg border border-line bg-surface grid gap-4"
        >
          <fieldset className="grid gap-2">
            <legend className="text-xs uppercase tracking-wider text-muted mb-1">
              Who can see the cumulative scoreboard
            </legend>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="scoreboardVisibility"
                value="PRIVATE"
                defaultChecked={user.org.scoreboardVisibility === "PRIVATE"}
                className="mt-1"
              />
              <span>
                <span className="font-medium">
                  Private — each person sees their own; editors see everyone
                </span>
                <span className="block text-xs text-muted">
                  Recommended default. Avoids the scoreboard becoming something
                  people get shamed by.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="scoreboardVisibility"
                value="MASTHEAD"
                defaultChecked={user.org.scoreboardVisibility === "MASTHEAD"}
                className="mt-1"
              />
              <span>
                <span className="font-medium">
                  Masthead-wide — everyone sees everyone
                </span>
                <span className="block text-xs text-muted">
                  Opt in once the newsroom trusts the numbers.
                </span>
              </span>
            </label>
          </fieldset>

          <div className="flex gap-4 flex-wrap">
            <label className="grid gap-1">
              <span className="text-xs uppercase tracking-wider text-muted">
                Overload threshold (pts/week)
              </span>
              <input
                type="number"
                name="overloadThreshold"
                step="0.5"
                min="0"
                defaultValue={user.org.overloadThreshold}
                className="px-3 py-2 rounded-md border border-line bg-background w-44"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs uppercase tracking-wider text-muted">
                Capacity threshold (pts/week)
              </span>
              <input
                type="number"
                name="underloadThreshold"
                step="0.5"
                min="0"
                defaultValue={user.org.underloadThreshold}
                className="px-3 py-2 rounded-md border border-line bg-background w-44"
              />
            </label>
            <button
              type="submit"
              className="self-end px-4 py-2 rounded-md bg-accent text-white text-sm hover:opacity-90 transition-opacity cursor-pointer"
            >
              Save
            </button>
          </div>
        </form>
      </section>

      <section className="mt-10">
        <div className="rule pb-2 mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Task types and weights
          </h2>
        </div>
        <p className="text-sm text-muted mb-4">
          Weights exist so a 20-second headline swap doesn&rsquo;t count the same
          as a 45-minute fact-check. Changing a weight affects new tasks only —
          already-logged work keeps the weight it had.
        </p>

        <ul className="grid gap-2">
          {taskTypes.map((t) => (
            <li
              key={t.id}
              className={`px-3 py-2 rounded-lg border border-line bg-surface flex items-center gap-3 flex-wrap ${
                t.archived ? "opacity-60" : ""
              }`}
            >
              <form
                action={upsertTaskTypeAction}
                className="flex items-center gap-2 flex-wrap flex-1"
              >
                <input type="hidden" name="id" value={t.id} />
                <input
                  name="name"
                  defaultValue={t.name}
                  className="px-2 py-1.5 rounded-md border border-line bg-background flex-1 min-w-52"
                />
                <input
                  type="number"
                  name="defaultWeight"
                  step="0.5"
                  min="0"
                  defaultValue={t.defaultWeight}
                  className="px-2 py-1.5 rounded-md border border-line bg-background w-24"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-md border border-line text-xs hover:border-accent transition-colors cursor-pointer"
                >
                  Save
                </button>
              </form>

              <form action={setTaskTypeArchivedAction}>
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="archived" value={t.archived ? "0" : "1"} />
                <button
                  type="submit"
                  className="px-2 py-1 text-xs text-muted hover:text-accent transition-colors cursor-pointer"
                >
                  {t.archived ? "Restore" : "Retire"}
                </button>
              </form>
            </li>
          ))}
        </ul>

        <form
          action={upsertTaskTypeAction}
          className="mt-4 p-3 rounded-lg border border-dashed border-line flex items-end gap-2 flex-wrap"
        >
          <label className="grid gap-1 flex-1 min-w-52">
            <span className="text-xs uppercase tracking-wider text-muted">
              Add a task type
            </span>
            <input
              name="name"
              placeholder="Newsletter write-up"
              required
              className="px-2 py-1.5 rounded-md border border-line bg-background w-full"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-wider text-muted">
              Weight
            </span>
            <input
              type="number"
              name="defaultWeight"
              step="0.5"
              min="0"
              defaultValue={1}
              className="px-2 py-1.5 rounded-md border border-line bg-background w-24"
            />
          </label>
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-accent text-white text-sm hover:opacity-90 transition-opacity cursor-pointer"
          >
            Add
          </button>
        </form>
      </section>

      <section className="mt-10">
        <div className="rule pb-2 mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider">
            Masthead
          </h2>
        </div>
        <p className="text-sm text-muted mb-4">
          Deskload is invite-first: add someone here and they can sign in with
          that email.
        </p>

        <ul className="grid gap-2">
          {members.map((m) => (
            <li
              key={m.id}
              className={`px-4 py-2.5 rounded-lg border border-line bg-surface flex items-center gap-3 flex-wrap ${
                m.active ? "" : "opacity-60"
              }`}
            >
              <span className="font-medium">{m.name}</span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-muted text-muted border border-line">
                {m.role.toLowerCase()}
              </span>
              <span className="text-xs text-muted">{m.email}</span>
              {!m.active && (
                <span className="text-[10px] uppercase tracking-wider text-muted">
                  inactive
                </span>
              )}
              {m.id !== user.id && (
                <form action={setUserActiveAction} className="ml-auto">
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="active" value={m.active ? "0" : "1"} />
                  <button
                    type="submit"
                    className="px-2 py-1 text-xs text-muted hover:text-accent transition-colors cursor-pointer"
                  >
                    {m.active ? "Deactivate" : "Reactivate"}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>

        <form
          action={addUserAction}
          className="mt-4 p-3 rounded-lg border border-dashed border-line flex items-end gap-2 flex-wrap"
        >
          <label className="grid gap-1 flex-1 min-w-40">
            <span className="text-xs uppercase tracking-wider text-muted">Name</span>
            <input
              name="name"
              required
              className="px-2 py-1.5 rounded-md border border-line bg-background w-full"
            />
          </label>
          <label className="grid gap-1 flex-1 min-w-52">
            <span className="text-xs uppercase tracking-wider text-muted">Email</span>
            <input
              type="email"
              name="email"
              required
              className="px-2 py-1.5 rounded-md border border-line bg-background w-full"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-wider text-muted">Role</span>
            <select
              name="role"
              defaultValue="STAFF"
              className="px-2 py-1.5 rounded-md border border-line bg-background"
            >
              <option value="STAFF">Staff</option>
              <option value="EDITOR">Editor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-accent text-white text-sm hover:opacity-90 transition-opacity cursor-pointer"
          >
            Add
          </button>
        </form>
      </section>
    </div>
  );
}
