"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as paymentsService from "@/lib/services/payments";

const createPlanSchema = z.object({
  totalFee: z.coerce.number().min(1, "Total fee is required"),
  numberOfInstallments: z.coerce.number().int().min(1, "At least 1 installment is required").max(24),
  firstDueDate: z.string().min(1, "First due date is required"),
});

export async function createPaymentPlanAction(studentId: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = createPlanSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const plan = await paymentsService.createPaymentPlan({ studentId, ...parsed.data });
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "PaymentPlan", entityId: plan.id, after: plan });

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/admin/payments");
}

const recordPaymentSchema = z.object({
  installmentId: z.string().optional(),
  amount: z.coerce.number().min(1, "Amount is required"),
  method: z.enum(["BANK_TRANSFER", "RAAST", "EASYPAISA", "JAZZCASH", "CASH", "OTHER"]),
  referenceNumber: z.string().optional(),
});

export async function recordPaymentAction(paymentPlanId: string, studentId: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = recordPaymentSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const payment = await paymentsService.recordPayment({
    paymentPlanId,
    studentId,
    installmentId: parsed.data.installmentId || undefined,
    amount: parsed.data.amount,
    method: parsed.data.method,
    referenceNumber: parsed.data.referenceNumber,
    recordedById: session.user.id,
  });
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "Payment", entityId: payment.id, after: payment });

  revalidatePath(`/students/${studentId}`);
  revalidatePath("/admin/payments");
  revalidatePath("/admin");
}
