import "server-only";
import { db } from "@/lib/db";
import { getSmsProvider } from "@/lib/sms";

export interface QueueSmsInput {
  recipientPhone: string;
  recipientUserId?: string;
  body: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

/** Creates a QUEUED SmsMessage row. Does not send. */
export function queueMessage(input: QueueSmsInput) {
  return db.smsMessage.create({
    data: {
      recipientPhone: input.recipientPhone,
      recipientUserId: input.recipientUserId,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      body: input.body,
      status: "QUEUED",
    },
  });
}

/** Sends a QUEUED message through the configured provider and updates its status. */
export async function sendQueuedMessage(id: string) {
  const message = await db.smsMessage.findUniqueOrThrow({ where: { id } });
  const provider = await getSmsProvider();
  const result = await provider.send(message.recipientPhone, message.body);

  return db.smsMessage.update({
    where: { id },
    data:
      result.status === "SENT"
        ? { status: "SENT", providerMessageId: result.providerMessageId, sentAt: new Date() }
        : { status: "FAILED", failedReason: result.failedReason },
  });
}

/** Convenience: queue then immediately send — used by campaign sends. */
export async function sendMessage(input: QueueSmsInput) {
  const queued = await queueMessage(input);
  return sendQueuedMessage(queued.id);
}

export function listMessages(filters?: { status?: string }) {
  return db.smsMessage.findMany({
    where: filters?.status ? { status: filters.status as never } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function messageStatusCounts() {
  const groups = await db.smsMessage.groupBy({ by: ["status"], _count: true });
  const counts: Record<string, number> = { QUEUED: 0, SENT: 0, FAILED: 0 };
  for (const g of groups) counts[g.status] = g._count;
  return counts;
}
