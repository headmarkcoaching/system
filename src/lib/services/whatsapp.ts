import "server-only";
import { db } from "@/lib/db";
import type { MessageTemplateKey } from "@prisma/client";
import { getWhatsAppProvider } from "@/lib/whatsapp";

export function renderTemplate(body: string, variables: Record<string, string | number | undefined | null>) {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = variables[key];
    return value === undefined || value === null ? match : String(value);
  });
}

/** Positional params for a Meta template send: each unique {{var}} in `templateBody`, in order
 * of first appearance, resolved against `variables` — register the Meta template with its
 * {{1}}, {{2}}... placeholders in that same order so positions line up. */
export function deriveTemplateParams(templateBody: string, variables: Record<string, string | number | undefined | null>) {
  const params: string[] = [];
  const seen = new Set<string>();
  for (const match of templateBody.matchAll(/\{\{(\w+)\}\}/g)) {
    const key = match[1];
    if (seen.has(key)) continue;
    seen.add(key);
    const value = variables[key];
    params.push(value === undefined || value === null ? "" : String(value));
  }
  return params;
}

export interface QueueMessageInput {
  recipientPhone: string;
  recipientUserId?: string;
  templateKey?: MessageTemplateKey;
  body?: string; // pre-rendered body; required if templateKey isn't supplied
  variables?: Record<string, string | number | undefined | null>;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

/** Renders (if needed) and creates a QUEUED WhatsAppMessage row. Does not send. */
export async function queueMessage(input: QueueMessageInput) {
  let body = input.body;

  if (input.templateKey) {
    const template = await db.messageTemplate.findUnique({ where: { key: input.templateKey } });
    if (template && template.isActive) {
      body = renderTemplate(template.body, input.variables ?? {});
    }
  }

  if (!body) throw new Error("queueMessage requires either a templateKey with an active template, or an explicit body.");

  return db.whatsAppMessage.create({
    data: {
      recipientPhone: input.recipientPhone,
      recipientUserId: input.recipientUserId,
      templateKey: input.templateKey,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      body,
      variables: input.variables as never,
      status: "QUEUED",
    },
  });
}

/** Sends a QUEUED message through the configured provider and updates its status. */
export async function sendQueuedMessage(id: string) {
  const message = await db.whatsAppMessage.findUniqueOrThrow({ where: { id }, include: { template: true } });
  const provider = await getWhatsAppProvider();
  const template =
    message.template?.metaTemplateName
      ? {
          templateName: message.template.metaTemplateName,
          languageCode: message.template.metaTemplateLanguage,
          bodyParams: deriveTemplateParams(message.template.body, (message.variables as Record<string, string | number | undefined | null>) ?? {}),
        }
      : undefined;
  const result = await provider.send(message.recipientPhone, message.body, template);

  return db.whatsAppMessage.update({
    where: { id },
    data:
      result.status === "SENT"
        ? { status: "SENT", providerMessageId: result.providerMessageId, sentAt: new Date() }
        : { status: "FAILED", failedReason: result.failedReason },
  });
}

/** Convenience: queue then immediately send — used by automation jobs and alert flows. */
export async function sendMessage(input: QueueMessageInput) {
  const queued = await queueMessage(input);
  return sendQueuedMessage(queued.id);
}

export function listMessages(filters?: { status?: string }) {
  return db.whatsAppMessage.findMany({
    where: filters?.status ? { status: filters.status as never } : undefined,
    include: { template: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function messageStatusCounts() {
  const groups = await db.whatsAppMessage.groupBy({ by: ["status"], _count: true });
  const counts: Record<string, number> = { QUEUED: 0, SENT: 0, DELIVERED: 0, READ: 0, FAILED: 0 };
  for (const g of groups) counts[g.status] = g._count;
  return counts;
}
