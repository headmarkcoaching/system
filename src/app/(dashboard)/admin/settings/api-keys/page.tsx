import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import * as apiKeysService from "@/lib/services/api-keys";
import { ApiKeysView } from "./api-keys-view";

export default async function ApiKeysSettingsPage() {
  const session = await auth();
  if (!session?.user || !STAFF_ROLES.includes(session.user.role)) redirect("/login");

  const keys = await apiKeysService.listApiKeys();

  return (
    <div className="space-y-6">
      <PageHeader title="API Keys" description="Bearer tokens for the /api/v1/* surface — for a future mobile app or external integration. Each key is rate-limited to 60 requests/minute." />
      <ApiKeysView keys={keys} />
    </div>
  );
}
