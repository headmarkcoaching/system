import "server-only";
import { auth } from "@/lib/auth";
import type { RoleKey } from "@prisma/client";
import { assertRole } from "@/lib/permissions";

export async function requireSession() {
  const session = await auth();
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
