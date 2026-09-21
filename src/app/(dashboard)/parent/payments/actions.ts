"use server";

import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import * as paymentsService from "@/lib/services/payments";
import * as uploadedFilesService from "@/lib/services/uploaded-files";

const METHODS = ["BANK_TRANSFER", "RAAST", "EASYPAISA", "JAZZCASH", "CASH", "OTHER"] as const;

/** Parent-facing payment submission — creates a PENDING record right away (so the parent sees
 * it immediately) but does not count toward the installment/fee status until a staff member
 * reviews the receipt and approves it (src/app/(dashboard)/admin/payments/actions.ts's
 * verifyPaymentAction). A receipt is required here (unlike staff's own recordPaymentAction,
 * which has always been optional) since "share the receipt" was the whole point of this flow. */
export async function submitParentPaymentAction(studentId: string, formData: FormData) {
  const session = await requireRoleSession(["PARENT"]);

  const parent = await db.parent.findUnique({ where: { userId: session.user.id } });
  if (!parent) throw new Error("Parent profile not found.");

  const link = await db.studentParentRelationship.findFirst({ where: { studentId, parentId: parent.id } });
  if (!link) throw new Error("This student is not linked to your account.");

  const plan = await paymentsService.listPaymentPlanForStudent(studentId);
  if (!plan) throw new Error("No payment plan exists for this student yet.");

  const amount = Number(formData.get("amount"));
  const method = formData.get("method") as string;
  const installmentId = (formData.get("installmentId") as string) || undefined;
  const referenceNumber = (formData.get("referenceNumber") as string) || undefined;
  const file = formData.get("file");

  if (!amount || amount <= 0) throw new Error("Enter a valid amount.");
  if (!METHODS.includes(method as (typeof METHODS)[number])) throw new Error("Select a payment method.");
  if (!(file instanceof File) || file.size === 0) throw new Error("Please attach a receipt (bank slip, JazzCash/Easypaisa screenshot, etc.).");

  const uploaded = await uploadedFilesService.uploadFile({ file, purpose: "PAYMENT_RECEIPT", uploadedById: session.user.id });

  const payment = await paymentsService.submitPaymentForReview({
    paymentPlanId: plan.id,
    studentId,
    installmentId,
    amount,
    method: method as never,
    referenceNumber,
    submittedById: session.user.id,
    receiptFileId: uploaded.id,
  });
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "Payment", entityId: payment.id, after: payment });

  revalidatePath("/parent/payments");
  revalidatePath("/parent");
  revalidatePath(`/students/${studentId}`);
  revalidatePath("/admin/payments");
}
