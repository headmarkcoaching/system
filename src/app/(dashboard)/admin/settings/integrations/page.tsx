import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SUPER_ADMIN_ONLY } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import * as integrationSettingsService from "@/lib/services/integration-settings";
import { IntegrationsForm } from "./integrations-form";

export default async function IntegrationsSettingsPage({ searchParams }: { searchParams: { google?: string; error?: string } }) {
  const session = await auth();
  if (!session?.user || !SUPER_ADMIN_ONLY.includes(session.user.role)) redirect("/login");

  const settings = await integrationSettingsService.getIntegrationSettingsForDisplay();
  const googleRedirectUri = `${process.env.NEXTAUTH_URL || ""}/api/integrations/google/callback`;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Integrations"
        description="Connect WhatsApp, email, and your Google account directly from here — no .env file or redeploy needed. Only visible to the Super Admin."
      />
      <IntegrationsForm settings={settings} googleStatus={searchParams.google} googleError={searchParams.error} googleRedirectUri={googleRedirectUri} />
    </div>
  );
}
