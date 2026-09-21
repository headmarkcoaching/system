"use server";

import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as notesSubscriptionsService from "@/lib/services/notes-subscriptions";

export async function verifyNotesPaymentAction(paymentId: string, approve: boolean) {
  const session = await requireRoleSession(STAFF_ROLES);
  const payment = await notesSubscriptionsService.verifySubscriptionPayment(paymentId, approve, session.user.id);
  await logAudit({ actorId: session.user.id, action: "STATUS_CHANGE", entityType: "NotesSubscriptionPayment", entityId: paymentId, after: { status: payment.status } });

  revalidatePath("/admin/notes-subscriptions");
  revalidatePath("/parent/notes-subscription");
  return payment;
}

export async function markNotesShippedAction(paymentId: string, trackingNote: string | undefined) {
  const session = await requireRoleSession(STAFF_ROLES);
  const payment = await notesSubscriptionsService.markShipped(paymentId, trackingNote);
  await logAudit({ actorId: session.user.id, action: "STATUS_CHANGE", entityType: "NotesSubscriptionPayment", entityId: paymentId, after: { shippedAt: payment.shippedAt } });

  revalidatePath("/admin/notes-subscriptions");
  revalidatePath("/parent/notes-subscription");
  return payment;
}
