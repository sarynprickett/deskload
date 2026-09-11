"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { devLoginEnabled } from "@/lib/auth";
import { clearSessionCookie, setSessionCookie } from "@/lib/session";

/// Local development sign-in. Refuses to run unless DEV_LOGIN=1 *and* we are not
/// in production, so it cannot become a way into a deployed newsroom.
export async function devSignInAction(formData: FormData) {
  if (!devLoginEnabled()) {
    throw new Error("Dev sign-in is disabled.");
  }

  const userId = String(formData.get("userId") ?? "");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.active) {
    redirect("/signin?error=unknown-user");
  }

  await setSessionCookie(user.id);
  redirect("/");
}

export async function signOutAction() {
  await clearSessionCookie();
  redirect("/signin");
}
