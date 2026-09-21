import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { NAV_BY_ROLE } from "@/lib/nav-config";
import { ROLE_LABELS } from "@/lib/permissions";
import * as notificationService from "@/lib/services/notifications";
import { signOutAction } from "./actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sections = NAV_BY_ROLE[session.user.role];
  const [notifications, unreadCount] = await Promise.all([
    notificationService.listForUser(session.user.id),
    notificationService.unreadCount(session.user.id),
  ]);

  return (
    <DashboardShell
      sections={sections}
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
