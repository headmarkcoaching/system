"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as communicationService from "@/lib/services/communication";

const schema = z.object({
  type: z.enum(["CALL", "WHATSAPP", "EMAIL", "SMS", "IN_PERSON", "SYSTEM"]),
  recipientName: z.string().optional(),
  subject: z.string().optional(),
  messageSummary: z.string().min(2, "Add a summary of the communication"),
});

export async function logCommunicationAction(studentId: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const log = await communicationService.logCommunication({ ...parsed.data, studentId, staffId: session.user.id });
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "CommunicationLog", entityId: log.id, after: log });

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/admin/parents");
}
