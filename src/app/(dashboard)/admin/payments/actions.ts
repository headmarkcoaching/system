"use server";

import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as paymentsService from "@/lib/services/payments";

export async function verifyPaymentAction(paymentId: string, approve: boolean) {
  const session = await requireRoleSession(STAFF_ROLES);
  const payment = await paymentsService.verifyParentPayment(paymentId, approve);
  await logAudit({ actorId: session.user.id, action: "STATUS_CHANGE", entityType: "Payment", entityId: paymentId, after: { status: payment.status } });

  revalidatePath("/admin/payments");
  revalidatePath(`/students/${payment.studentId}`);
  revalidatePath("/parent/payments");
  revalidatePath("/parent");
  return payment;
}

export async function sendPaymentReminderAction(installmentId: string) {
  const session = await requireRoleSession(STAFF_ROLES);
  const result = await paymentsService.sendManualPaymentReminder(installmentId);
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "PaymentReminder", entityId: installmentId, after: result });
  return result;
}

export async function sendBulkOverdueRemindersAction() {
  const session = await requireRoleSession(STAFF_ROLES);
  const result = await paymentsService.sendBulkOverdueReminders();
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "PaymentReminder", entityId: "bulk-overdue", after: result });
  return result;
}
