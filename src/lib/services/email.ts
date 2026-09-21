import "server-only";
import { db } from "@/lib/db";
import type { MessageTemplateKey } from "@prisma/client";
import { getEmailProvider } from "@/lib/email";
import { renderTemplate } from "@/lib/services/whatsapp";

export interface QueueEmailInput {
  recipientEmail: string;
  recipientUserId?: string;
  templateKey?: MessageTemplateKey;
  subject?: string;
  body?: string; // pre-rendered body; required (with subject) if templateKey isn't supplied
  variables?: Record<string, string | number | undefined | null>;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

/** Renders (if needed) and creates a QUEUED EmailMessage row. Does not send. Returns null if the
 * rule's template has no email content configured yet — the caller should treat that as "this
 * rule isn't wired up for email" rather than an error. */
export async function queueMessage(input: QueueEmailInput) {
  let subject = input.subject;
  let body = input.body;

  if (input.templateKey) {
    const template = await db.messageTemplate.findUnique({ where: { key: input.templateKey } });
    if (!template?.isActive || !template.emailSubject || !template.emailBody) return null;
    subject = renderTemplate(template.emailSubject, input.variables ?? {});
    body = renderTemplate(template.emailBody, input.variables ?? {});
  }

  if (!subject || !body) throw new Error("queueMessage requires either a templateKey with email content configured, or an explicit subject + body.");

  return db.emailMessage.create({
    data: {
      recipientEmail: input.recipientEmail,
      recipientUserId: input.recipientUserId,
      templateKey: input.templateKey,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      subject,
      body,
      status: "QUEUED",
    },
  });
}

/** Sends a QUEUED message through the configured provider and updates its status. */
export async function sendQueuedMessage(id: string) {
  const message = await db.emailMessage.findUniqueOrThrow({ where: { id } });
  const provider = await getEmailProvider();
  const result = await provider.send(message.recipientEmail, message.subject, message.body);

  return db.emailMessage.update({
    where: { id },
    data:
      result.status === "SENT"
        ? { status: "SENT", providerMessageId: result.providerMessageId, sentAt: new Date() }
        : { status: "FAILED", failedReason: result.failedReason },
  });
}

/** Convenience: queue then immediately send — used by automation jobs and alert flows. Returns
 * null (and sends nothing) if the rule's template has no email content configured. */
export async function sendMessage(input: QueueEmailInput) {
  const queued = await queueMessage(input);
  if (!queued) return null;
  return sendQueuedMessage(queued.id);
}

export function listMessages(filters?: { status?: string }) {
  return db.emailMessage.findMany({
    where: filters?.status ? { status: filters.status as never } : undefined,
    include: { template: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function messageStatusCounts() {
  const groups = await db.emailMessage.groupBy({ by: ["status"], _count: true });
  const counts: Record<string, number> = { QUEUED: 0, SENT: 0, FAILED: 0 };
  for (const g of groups) counts[g.status] = g._count;
  return counts;
}
