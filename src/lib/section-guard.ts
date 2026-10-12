import "server-only";
import { redirect } from "next/navigation";
import type { RoleKey } from "@prisma/client";
import { getVerifiedSession } from "@/lib/session";
import { ROLE_HOME_PATH } from "@/lib/permissions";

/**
 * Server-side role check for a whole area of the app (/admin, /teacher, ...). The middleware
 * already redirects the wrong role, but many pages inside these areas have no check of their own,
 * so the middleware alone was the only thing between a signed-in student and an admin page. This
 * makes the layout enforce the same rule independently.
 */
export async function requireSection(allowed: RoleKey[]) {
  const session = await getVerifiedSession();
  if (!session?.user) redirect("/signed-out");
  if (!allowed.includes(session.user.role)) redirect(ROLE_HOME_PATH[session.user.role]);
  return session;
}
