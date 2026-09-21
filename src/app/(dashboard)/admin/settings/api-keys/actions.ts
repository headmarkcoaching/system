"use server";

import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as apiKeysService from "@/lib/services/api-keys";

export async function createApiKeyAction(label: string) {
  const session = await requireRoleSession(STAFF_ROLES);
  if (!label || label.trim().length < 2) return { error: "Label is required." };

  const result = await apiKeysService.createApiKey({ label: label.trim(), createdById: session.user.id });
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "ApiKey", entityId: result.id, after: { label: result.label } });
  revalidatePath("/admin/settings/api-keys");
  return { rawKey: result.rawKey };
}

export async function revokeApiKeyAction(id: string) {
  const session = await requireRoleSession(STAFF_ROLES);
  await apiKeysService.revokeApiKey(id);
  await logAudit({ actorId: session.user.id, action: "STATUS_CHANGE", entityType: "ApiKey", entityId: id, after: { revoked: true } });
  revalidatePath("/admin/settings/api-keys");
}
