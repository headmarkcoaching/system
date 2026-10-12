import "server-only";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { RoleKey } from "@prisma/client";
import { assertRole } from "@/lib/permissions";

/**
 * The signed session, re-checked against the database. A JWT on its own stays valid until it
 * expires, so without this a deactivated account, a changed role, or a password reset would not
 * take effect until the cookie ran out. Returns null when the session should no longer be trusted.
 */
export async function getVerifiedSession() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { isActive: true, roleKey: true, passwordChangedAt: true },
  });
  if (!user || !user.isActive) return null;
  if (user.roleKey !== session.user.role) return null;

  // Sessions from before this check existed carry no sign-in time; make them sign in again.
  if (typeof session.user.authAt !== "number") return null;
  if (user.passwordChangedAt && user.passwordChangedAt.getTime() > session.user.authAt) return null;

  return session;
}

export async function requireSession() {
  const session = await getVerifiedSession();
  if (!session?.user) {
    throw new Error("You must be signed in to do that.");
  }
  return session;
}

export async function requireRoleSession(allowed: RoleKey[]) {
  const session = await requireSession();
  assertRole(session.user.role, allowed);
  return session;
}
