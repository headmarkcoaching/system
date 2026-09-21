"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireSession, requireRoleSession } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/permissions";
import { assertCanManageSupportTicket } from "@/lib/access";
import { logAudit } from "@/lib/audit";
import * as supportService from "@/lib/services/support";
import * as staffService from "@/lib/services/staff";
import * as automationService from "@/lib/services/automation";

const ticketSchema = z.object({
  category: z.enum(["ACADEMIC", "TECHNICAL", "PAYMENT", "ACCOUNT", "OTHER"]),
  subject: z.string().min(2, "Subject is required"),
  description: z.string().min(2, "Description is required"),
  attachmentUrl: z.string().optional(),
});

export async function createTicketAction(data: Record<string, unknown>) {
  const session = await requireSession();
  const parsed = ticketSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const ticket = await supportService.createTicket({
    raisedById: session.user.id,
    category: parsed.data.category,
    subject: parsed.data.subject,
    description: parsed.data.description,
    attachmentUrl: parsed.data.attachmentUrl || undefined,
  });
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "SupportTicket", entityId: ticket.id, after: ticket });

  try {
    const adminIds = await staffService.listAdminUserIds();
    await automationService.dispatchAlert({
      userIds: adminIds,
      notificationType: "SUPPORT_TICKET_UPDATE",
      title: "New support ticket",
      message: `${session.user.name} raised a ticket: ${ticket.subject}`,
      relatedEntityType: "SupportTicket",
      relatedEntityId: ticket.id,
    });
  } catch (err) {
    console.error("support ticket creation notification failed", err);
  }

  revalidatePath("/support");
  revalidatePath("/admin/support");
  return { ticketId: ticket.id };
}

export async function addMessageAction(ticketId: string, message: string, attachmentUrl?: string) {
  const session = await requireSession();
  await assertCanManageSupportTicket(session, ticketId);

  const record = await supportService.addMessage(ticketId, session.user.id, message, attachmentUrl || undefined);

  try {
    const ticket = await supportService.getTicketWithMessages(ticketId);
    if (ticket) {
      const isStaffReply = STAFF_ROLES.includes(session.user.role);
      const recipientIds = isStaffReply ? [ticket.raisedById] : ticket.assignedToId ? [ticket.assignedToId] : await staffService.listAdminUserIds();
      await automationService.dispatchAlert({
        userIds: recipientIds.filter((id) => id !== session.user.id),
        notificationType: "SUPPORT_TICKET_UPDATE",
        title: "New reply on your support ticket",
        message: `${session.user.name} replied on: ${ticket.subject}`,
        relatedEntityType: "SupportTicket",
        relatedEntityId: ticketId,
      });
    }
  } catch (err) {
    console.error("support message notification failed", err);
  }

  revalidatePath(`/support/${ticketId}`);
  return record;
}

export async function updateTicketStatusAction(ticketId: string, status: "OPEN" | "IN_PROGRESS" | "WAITING_FOR_USER" | "RESOLVED" | "CLOSED") {
  const session = await requireRoleSession(STAFF_ROLES);
  const record = await supportService.updateTicketStatus(ticketId, status);
  await logAudit({ actorId: session.user.id, action: "STATUS_CHANGE", entityType: "SupportTicket", entityId: ticketId, after: { status } });
  revalidatePath(`/support/${ticketId}`);
  revalidatePath("/admin/support");
  return record;
}

export async function assignTicketAction(ticketId: string, assignedToId: string | null) {
  const session = await requireRoleSession(STAFF_ROLES);
  const record = await supportService.assignTicket(ticketId, assignedToId);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "SupportTicket", entityId: ticketId, after: { assignedToId } });
  revalidatePath(`/support/${ticketId}`);
  revalidatePath("/admin/support");
  return record;
}
