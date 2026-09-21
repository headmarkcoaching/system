import "server-only";
import { db } from "@/lib/db";
import type { PaymentMethod } from "@prisma/client";

// Flat rate, same for every subject — the user's own spec ("1500 per subject per student per
// month"). A per-level or per-subject price list would be easy to add later if the academy ever
// wants to differentiate, but nothing today asks for that.
export const NOTES_PRICE_PER_MONTH = 1500;

export function currentMonthLabel(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export interface CreateSubscriptionInput {
  studentId: string;
  subjectId: string;
  deliveryName: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryPhone: string;
  createdById: string;
}

/** Re-subscribing to a subject the student previously cancelled reuses the same row (the
 * @@unique([studentId, subjectId]) means there can only ever be one) rather than creating a
 * second history-losing row — status just flips back to ACTIVE with fresh delivery details. */
export async function createSubscription(input: CreateSubscriptionInput) {
  const existing = await db.notesSubscription.findUnique({ where: { studentId_subjectId: { studentId: input.studentId, subjectId: input.subjectId } } });
  if (existing && existing.status === "ACTIVE") {
    throw new Error("Already subscribed for this subject.");
  }
  if (existing) {
    return db.notesSubscription.update({
      where: { id: existing.id },
      data: {
        status: "ACTIVE",
        deliveryName: input.deliveryName,
        deliveryAddress: input.deliveryAddress,
        deliveryCity: input.deliveryCity,
        deliveryPhone: input.deliveryPhone,
        pricePerMonth: NOTES_PRICE_PER_MONTH,
        cancelledAt: null,
      },
    });
  }
  return db.notesSubscription.create({
    data: {
      studentId: input.studentId,
      subjectId: input.subjectId,
      pricePerMonth: NOTES_PRICE_PER_MONTH,
      deliveryName: input.deliveryName,
      deliveryAddress: input.deliveryAddress,
      deliveryCity: input.deliveryCity,
      deliveryPhone: input.deliveryPhone,
      createdById: input.createdById,
    },
  });
}

export async function cancelSubscription(id: string) {
  return db.notesSubscription.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
}

// Subjects aren't scoped by academic level in this schema (Subject.academicLevelId is only ever
// used for admin-catalog filtering) — what a given student can actually subscribe notes for is
// whatever subject their own batch teaches, via BatchSubject, same source of truth the batch's
// own Homework/Tests tabs already use for "which subjects does this student take."
export async function listSubscribableSubjectsForStudent(studentId: string) {
  const batchIds = (await db.batchStudent.findMany({ where: { studentId }, select: { batchId: true } })).map((b) => b.batchId);
  if (batchIds.length === 0) return [];
  const links = await db.batchSubject.findMany({ where: { batchId: { in: batchIds } }, include: { subject: true }, distinct: ["subjectId"] });
  return links.map((l) => l.subject).filter((s) => s.isActive).sort((a, b) => a.name.localeCompare(b.name));
}

export function listSubscriptionsForStudent(studentId: string) {
  return db.notesSubscription.findMany({
    where: { studentId },
    include: { subject: true, payments: { orderBy: { monthLabel: "desc" } } },
    orderBy: { subscribedAt: "desc" },
  });
}

export function listAllSubscriptions() {
  return db.notesSubscription.findMany({
    include: { student: true, subject: true, payments: { orderBy: { monthLabel: "desc" }, take: 1 } },
    orderBy: { subscribedAt: "desc" },
  });
}

export function listPendingSubscriptionPayments() {
  return db.notesSubscriptionPayment.findMany({
    where: { status: "PENDING" },
    include: { subscription: { include: { student: true, subject: true } } },
    orderBy: { submittedAt: "asc" },
  });
}

export interface SubmitSubscriptionPaymentInput {
  subscriptionId: string;
  monthLabel: string;
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  receiptFileId: string;
}

/** Same self-reported-then-staff-verified shape as a tuition payment (submitPaymentForReview) —
 * a parent's own submission never counts as paid on its own, a staff member has to check the
 * receipt first (verifySubscriptionPayment, below). */
export async function submitSubscriptionPayment(input: SubmitSubscriptionPaymentInput) {
  return db.notesSubscriptionPayment.upsert({
    where: { subscriptionId_monthLabel: { subscriptionId: input.subscriptionId, monthLabel: input.monthLabel } },
    create: {
      subscriptionId: input.subscriptionId,
      monthLabel: input.monthLabel,
      amount: input.amount,
      method: input.method,
      referenceNumber: input.referenceNumber,
      receiptFileId: input.receiptFileId,
      status: "PENDING",
    },
    update: {
      amount: input.amount,
      method: input.method,
      referenceNumber: input.referenceNumber,
      receiptFileId: input.receiptFileId,
      status: "PENDING",
      submittedAt: new Date(),
    },
  });
}

export async function verifySubscriptionPayment(paymentId: string, approve: boolean, verifiedById: string) {
  const payment = await db.notesSubscriptionPayment.findUniqueOrThrow({ where: { id: paymentId } });
  if (payment.status !== "PENDING") throw new Error("This payment has already been reviewed.");

  return db.notesSubscriptionPayment.update({
    where: { id: paymentId },
    data: approve ? { status: "PAID", verifiedAt: new Date(), verifiedById } : { status: "REJECTED", verifiedAt: new Date(), verifiedById },
  });
}

export async function markShipped(paymentId: string, trackingNote: string | undefined) {
  const payment = await db.notesSubscriptionPayment.findUniqueOrThrow({ where: { id: paymentId } });
  if (payment.status !== "PAID") throw new Error("Only a paid month can be marked shipped.");
  return db.notesSubscriptionPayment.update({ where: { id: paymentId }, data: { shippedAt: new Date(), trackingNote } });
}
