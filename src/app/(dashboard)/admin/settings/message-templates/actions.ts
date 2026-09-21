"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import type { MessageTemplateKey } from "@prisma/client";
import { requireRoleSession } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as templateService from "@/lib/services/message-templates";

const schema = z.object({
  body: z.string().min(1, "Message body is required"),
  isActive: z.boolean(),
  emailSubject: z.string().optional(),
  emailBody: z.string().optional(),
  metaTemplateName: z.string().optional(),
  metaTemplateLanguage: z.string().optional(),
});

export async function updateMessageTemplateAction(key: MessageTemplateKey, data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const record = await templateService.updateTemplate(key, parsed.data, session.user.id);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "MessageTemplate", entityId: record.id, after: record });

  revalidatePath("/admin/settings/message-templates");
}
