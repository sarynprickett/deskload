import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";

export type Role = "ADMIN" | "EDITOR" | "STAFF";

/// Deskload is invite-first: an admin adds the masthead, and people sign in
/// against a user record that already exists. When Google OAuth is added, the
/// only change is where `getSessionUserId` comes from — this lookup and every
/// permission helper below stay exactly as they are.
export const getCurrentUser = cache(async () => {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { org: true },
  });

  if (!user || !user.active) return null;
  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user;
}

/// §6/§7: the weekly workload report and newsroom settings are editor/admin only.
export async function requireEditor() {
  const user = await requireUser();
  if (user.role === "STAFF") redirect("/?denied=editors-only");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/?denied=admins-only");
  return user;
}

export function isEditor(role: Role) {
  return role === "ADMIN" || role === "EDITOR";
}

/// §11: anyone may log a task for themselves; only editors/admins may credit
/// someone else, to avoid credit disputes.
export function canCreditOthers(role: Role) {
  return isEditor(role);
}

/// Dev sign-in is a local convenience only and is hard-disabled in production.
export function devLoginEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.DEV_LOGIN === "1";
}
