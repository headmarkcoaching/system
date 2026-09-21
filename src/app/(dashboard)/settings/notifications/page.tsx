import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import * as commPrefsService from "@/lib/services/communication-preferences";
import { NotificationPreferencesForm } from "./preferences-form";

export default async function NotificationPreferencesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const preference = await commPrefsService.getPreference(session.user.id);

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader
        title="Notification Preferences"
        description="Choose which channels you want non-critical notifications on. Critical alerts (payment reminders, attendance alerts, performance alerts) always go out — the academy controls those."
      />
      <NotificationPreferencesForm preference={{ whatsappEnabled: preference.whatsappEnabled, emailEnabled: preference.emailEnabled, smsEnabled: preference.smsEnabled }} />
    </div>
  );
}
