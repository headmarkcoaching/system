import { redirect } from "next/navigation";
import { getVerifiedSession } from "@/lib/session";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { NAV_BY_ROLE, MOBILE_TABS } from "@/lib/nav-config";
import { ROLE_LABELS } from "@/lib/permissions";
import * as notificationService from "@/lib/services/notifications";
import { signOutAction } from "./actions";

// Everything behind sign-in is per-user data; never prerender it at build time.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getVerifiedSession();
  // Not just "signed out": also covers a switched-off account or a password changed since sign-in.
  if (!session?.user) redirect("/signed-out");

  const sections = NAV_BY_ROLE[session.user.role];
  const [notifications, unreadCount] = await Promise.all([
    notificationService.listForUser(session.user.id),
    notificationService.unreadCount(session.user.id),
  ]);

  return (
    <DashboardShell
      sections={sections}
      tabs={MOBILE_TABS[session.user.role]}
      roleLabel={ROLE_LABELS[session.user.role]}
      userName={session.user.name}
      signOutAction={signOutAction}
      notifications={notifications}
      unreadCount={unreadCount}
    >
      {children}
    </DashboardShell>
  );
}
