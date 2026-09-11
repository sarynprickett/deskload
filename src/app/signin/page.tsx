import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { devLoginEnabled, getCurrentUser } from "@/lib/auth";
import { devSignInAction } from "@/app/actions/auth";

export default async function SignInPage() {
  const existing = await getCurrentUser();
  if (existing) redirect("/");

  const devMode = devLoginEnabled();
  const users = devMode
    ? await prisma.user.findMany({
        where: { active: true },
        include: { org: true },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      })
    : [];

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="display text-3xl font-semibold tracking-tight">
        Sign in to Deskload
      </h1>
      <p className="mt-3 text-muted leading-relaxed">
        Deskload is invite-first: an editor adds the masthead, and you sign in
        against a record that already exists.
      </p>

      {devMode ? (
        <section className="mt-8">
          <div className="rule pb-2 mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Local development sign-in
            </h2>
            <span className="text-xs text-muted">no password</span>
          </div>

          <p className="text-sm text-muted mb-4">
            This user switcher exists only for local development. It is disabled
            automatically when <code className="text-xs">NODE_ENV=production</code>.
          </p>

          <ul className="grid gap-2">
            {users.map((u) => (
              <li key={u.id}>
                <form action={devSignInAction}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button
                    type="submit"
                    className="w-full text-left px-4 py-3 rounded-lg border border-line bg-surface hover:border-accent hover:bg-accent-soft transition-colors cursor-pointer flex items-center gap-3"
                  >
                    <span className="font-medium">{u.name}</span>
                    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-muted text-muted border border-line">
                      {u.role.toLowerCase()}
                    </span>
                    <span className="ml-auto text-xs text-muted">{u.email}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>

          {users.length === 0 && (
            <p className="text-sm text-muted">
              No users yet. Run <code className="text-xs">npm run db:seed</code>.
            </p>
          )}
        </section>
      ) : (
        <div className="mt-8 p-4 rounded-lg border border-line bg-surface">
          <p className="text-sm text-muted">
            No sign-in method is configured. Enable the local user switcher with{" "}
            <code className="text-xs">DEV_LOGIN=1</code>, or wire up Google OAuth
            for production.
          </p>
        </div>
      )}
    </div>
  );
}
