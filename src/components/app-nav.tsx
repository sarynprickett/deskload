import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { isEditor, type Role } from "@/lib/auth";

type NavUser = {
  name: string;
  role: Role;
  org: { name: string };
} | null;

export function AppNav({ user }: { user: NavUser }) {
  return (
    <header className="border-b border-line bg-surface">
      <div className="max-w-6xl mx-auto px-5 py-3 flex items-center gap-6 flex-wrap">
        <Link href="/" className="display text-xl font-semibold tracking-tight">
          Deskload
        </Link>

        {user && (
          <>
            <nav className="flex items-center gap-5 text-sm">
              <Link href="/issues" className="hover:text-accent transition-colors">
                Issues
              </Link>
              <Link href="/scoreboard" className="hover:text-accent transition-colors">
                Scoreboard
              </Link>
              {isEditor(user.role) && (
                <Link
                  href="/reports/weekly"
                  className="hover:text-accent transition-colors"
                >
                  Weekly report
                </Link>
              )}
              {user.role === "ADMIN" && (
                <Link href="/settings" className="hover:text-accent transition-colors">
                  Settings
                </Link>
              )}
            </nav>

            <div className="ml-auto flex items-center gap-3 text-sm">
              <span className="text-muted hidden sm:inline">
                {user.org.name}
              </span>
              <span className="font-medium">{user.name}</span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-muted text-muted border border-line">
                {user.role.toLowerCase()}
              </span>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="text-muted hover:text-accent transition-colors cursor-pointer"
                >
                  Sign out
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
