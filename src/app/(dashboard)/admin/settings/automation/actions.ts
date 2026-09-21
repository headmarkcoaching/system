"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { AutomationRuleKey } from "@prisma/client";
import { requireRoleSession } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as automationService from "@/lib/services/automation";

const updateSchema = z.object({
  isActive: z.boolean(),
  config: z.record(z.coerce.number()),
});

export async function updateAutomationRuleAction(key: AutomationRuleKey, data: { isActive: boolean; config: Record<string, unknown> }) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = updateSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const record = await automationService.updateRule(key, parsed.data, session.user.id);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "AutomationRule", entityId: record.id, after: record });

  revalidatePath("/admin/settings/automation");
}
