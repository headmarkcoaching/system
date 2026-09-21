"use server";

import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import * as notesSubscriptionsService from "@/lib/services/notes-subscriptions";
import * as uploadedFilesService from "@/lib/services/uploaded-files";

const METHODS = ["BANK_TRANSFER", "RAAST", "EASYPAISA", "JAZZCASH", "CASH", "OTHER"] as const;

async function assertOwnsStudent(userId: string, studentId: string) {
  const parent = await db.parent.findUnique({ where: { userId } });
  if (!parent) throw new Error("Parent profile not found.");
  const link = await db.studentParentRelationship.findFirst({ where: { studentId, parentId: parent.id } });
  if (!link) throw new Error("This student is not linked to your account.");
}

export async function subscribeNotesAction(studentId: string, formData: FormData) {
  const session = await requireRoleSession(["PARENT"]);
  await assertOwnsStudent(session.user.id, studentId);

  const subjectId = formData.get("subjectId") as string;
  const deliveryName = (formData.get("deliveryName") as string) || "";
  const deliveryAddress = (formData.get("deliveryAddress") as string) || "";
  const deliveryCity = (formData.get("deliveryCity") as string) || "";
  const deliveryPhone = (formData.get("deliveryPhone") as string) || "";

  if (!subjectId) throw new Error("Select a subject.");
  if (!deliveryName || !deliveryAddress || !deliveryCity || !deliveryPhone) throw new Error("Fill in the full delivery address.");

  const subscription = await notesSubscriptionsService.createSubscription({
    studentId,
    subjectId,
    deliveryName,
    deliveryAddress,
    deliveryCity,
    deliveryPhone,
    createdById: session.user.id,
  });
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "NotesSubscription", entityId: subscription.id, after: subscription });

  revalidatePath("/parent/notes-subscription");
  revalidatePath("/admin/notes-subscriptions");
  return subscription;
}

export async function cancelNotesSubscriptionAction(subscriptionId: string, studentId: string) {
  const session = await requireRoleSession(["PARENT"]);
  await assertOwnsStudent(session.user.id, studentId);

  await notesSubscriptionsService.cancelSubscription(subscriptionId);
  await logAudit({ actorId: session.user.id, action: "STATUS_CHANGE", entityType: "NotesSubscription", entityId: subscriptionId, after: { status: "CANCELLED" } });

  revalidatePath("/parent/notes-subscription");
  revalidatePath("/admin/notes-subscriptions");
}

export async function submitNotesPaymentAction(studentId: string, subscriptionId: string, formData: FormData) {
  const session = await requireRoleSession(["PARENT"]);
  await assertOwnsStudent(session.user.id, studentId);

  const method = formData.get("method") as string;
  const referenceNumber = (formData.get("referenceNumber") as string) || undefined;
  const file = formData.get("file");

  if (!METHODS.includes(method as (typeof METHODS)[number])) throw new Error("Select a payment method.");
  if (!(file instanceof File) || file.size === 0) throw new Error("Please attach a receipt (bank slip, JazzCash/Easypaisa screenshot, etc.).");

  const uploaded = await uploadedFilesService.uploadFile({ file, purpose: "NOTES_SUBSCRIPTION_RECEIPT", uploadedById: session.user.id });

  const payment = await notesSubscriptionsService.submitSubscriptionPayment({
    subscriptionId,
    monthLabel: notesSubscriptionsService.currentMonthLabel(),
    amount: notesSubscriptionsService.NOTES_PRICE_PER_MONTH,
    method: method as never,
    referenceNumber,
    receiptFileId: uploaded.id,
  });
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "NotesSubscriptionPayment", entityId: payment.id, after: payment });

  revalidatePath("/parent/notes-subscription");
  revalidatePath("/admin/notes-subscriptions");
}
