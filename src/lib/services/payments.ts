import "server-only";
import { db } from "@/lib/db";
import type { PaymentMethod } from "@prisma/client";
import { logAnalyticsEvent } from "@/lib/services/analytics-events";
import * as automationService from "@/lib/services/automation";
import * as recipients from "@/lib/services/automation-recipients";
import { formatPKR, formatDate } from "@/lib/utils";

export interface CreatePaymentPlanInput {
  studentId: string;
  totalFee: number;
  numberOfInstallments: number;
  firstDueDate: string;
}

export async function createPaymentPlan(input: CreatePaymentPlanInput) {
  const perInstallment = Math.round((input.totalFee / input.numberOfInstallments) * 100) / 100;
  const firstDue = new Date(input.firstDueDate);

  return db.paymentPlan.create({
    data: {
      studentId: input.studentId,
      totalFee: input.totalFee,
      installments: {
        create: Array.from({ length: input.numberOfInstallments }, (_, i) => {
          const dueDate = new Date(firstDue);
          dueDate.setMonth(dueDate.getMonth() + i);
          const isLast = i === input.numberOfInstallments - 1;
          const runningTotal = perInstallment * i;
          const amount = isLast ? Math.round((input.totalFee - runningTotal) * 100) / 100 : perInstallment;
          return { installmentNumber: i + 1, amount, dueDate };
        }),
      },
    },
    include: { installments: true },
  });
}

export function listPaymentPlanForStudent(studentId: string) {
  return db.paymentPlan.findFirst({
    where: { studentId },
    include: { installments: { orderBy: { installmentNumber: "asc" } }, payments: { orderBy: { createdAt: "desc" } } },
    orderBy: { createdAt: "desc" },
  });
}

export interface RecordPaymentInput {
  paymentPlanId: string;
  studentId: string;
  installmentId?: string;
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  recordedById: string;
  receiptFileId?: string;
  isSelfReported?: boolean;
}

/** Recomputes one installment's status from the sum of its currently-PAID payments — shared by
 * both the staff-recorded flow (recordPayment, below) and staff's approval of a parent-submitted
 * payment (verifyParentPayment), so the two paths can never compute this differently. */
async function syncInstallmentStatus(installmentId: string) {
  const installment = await db.installment.findUniqueOrThrow({ where: { id: installmentId } });
  const paidSoFar = await db.payment.aggregate({
    where: { installmentId, status: "PAID" },
    _sum: { amount: true },
  });
  const totalPaidForInstallment = Number(paidSoFar._sum.amount ?? 0);
  const installmentAmount = Number(installment.amount);
  const isFullyPaid = totalPaidForInstallment >= installmentAmount;
  await db.installment.update({
    where: { id: installmentId },
    data: { status: isFullyPaid ? "PAID" : "PARTIALLY_PAID", paidAt: isFullyPaid ? new Date() : undefined },
  });
}

/** Staff-recorded payment — trusted immediately, same as it's always been (staff already has
 * full access to the student's records). Never used for a parent's own submission — see
 * submitPaymentForReview below. */
export async function recordPayment(input: RecordPaymentInput) {
  const payment = await db.payment.create({
    data: {
      paymentPlanId: input.paymentPlanId,
      studentId: input.studentId,
      installmentId: input.installmentId,
      amount: input.amount,
      method: input.method,
      status: "PAID",
      paidAt: new Date(),
      referenceNumber: input.referenceNumber,
      recordedById: input.recordedById,
      receiptFileId: input.receiptFileId,
      isSelfReported: input.isSelfReported ?? false,
    },
  });

  logAnalyticsEvent({ userId: input.recordedById, eventType: "PAYMENT_RECORDED", entityType: "Payment", entityId: payment.id, metadata: { amount: input.amount, method: input.method } }).catch((err) =>
    console.error("logAnalyticsEvent failed", err)
  );

  if (input.installmentId) await syncInstallmentStatus(input.installmentId);

  return payment;
}

export interface SubmitPaymentForReviewInput {
  paymentPlanId: string;
  studentId: string;
  installmentId?: string;
  amount: number;
  method: PaymentMethod;
  referenceNumber?: string;
  submittedById: string;
  receiptFileId: string;
}

/** A parent's own payment submission — per product decision, this does NOT count as paid until
 * a staff member reviews the receipt and approves it (see verifyParentPayment). The Payment row
 * exists immediately (so the parent sees it as "pending" right away and staff has a queue to
 * work from), but the linked Installment is untouched until approval — a student's monthly-fee
 * status (and the soft banner built on it) only ever reflects staff-confirmed payments. */
export async function submitPaymentForReview(input: SubmitPaymentForReviewInput) {
  const payment = await db.payment.create({
    data: {
      paymentPlanId: input.paymentPlanId,
      studentId: input.studentId,
      installmentId: input.installmentId,
      amount: input.amount,
      method: input.method,
      status: "PENDING",
      referenceNumber: input.referenceNumber,
      recordedById: input.submittedById,
      receiptFileId: input.receiptFileId,
      isSelfReported: true,
    },
  });

  logAnalyticsEvent({ userId: input.submittedById, eventType: "PAYMENT_SUBMITTED_FOR_REVIEW", entityType: "Payment", entityId: payment.id, metadata: { amount: input.amount, method: input.method } }).catch(
    (err) => console.error("logAnalyticsEvent failed", err)
  );

  return payment;
}

/** Staff approves or rejects a parent-submitted payment after checking the receipt. Approving
 * is the only path that ever flips the payment to PAID and re-syncs the installment — a
 * rejected submission never touches the installment at all, and stays visible (not deleted) so
 * the parent can see it was rejected and try again. */
export async function verifyParentPayment(paymentId: string, approve: boolean) {
  const payment = await db.payment.findUniqueOrThrow({ where: { id: paymentId } });
  if (payment.status !== "PENDING") throw new Error("This payment has already been reviewed.");

  const updated = await db.payment.update({
    where: { id: paymentId },
    data: approve ? { status: "PAID", paidAt: new Date() } : { status: "REJECTED" },
  });

  if (approve && payment.installmentId) await syncInstallmentStatus(payment.installmentId);

  return updated;
}

export function listPendingReviewPayments() {
  return db.payment.findMany({
    where: { status: "PENDING", isSelfReported: true },
    include: { student: true, installment: true },
    orderBy: { createdAt: "asc" },
  });
}

/** "If they pay September's fee, their children can attend September's classes" — installments
 * are already generated one per calendar month from the plan's first due date (createPaymentPlan
 * above), so "the installment covering this month" is simply the one whose dueDate falls in the
 * current month/year; no separate period field was needed. Returns null if the plan doesn't
 * cover the current month at all (ended, or hasn't started yet), which the caller renders as "no
 * plan" rather than conflating it with an unpaid month. This only ever powers a soft,
 * informational banner — nothing in the app actually blocks attendance or class access on it. */
export async function getCurrentMonthPaymentStatus(studentId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const installment = await db.installment.findFirst({
    where: { paymentPlan: { studentId }, dueDate: { gte: monthStart, lt: monthEnd } },
    orderBy: { dueDate: "asc" },
  });
  if (!installment) return null;

  return { installment, effectiveStatus: effectiveInstallmentStatus(installment), monthLabel: monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" }) };
}

export function effectiveInstallmentStatus(installment: { status: string; dueDate: Date }) {
  if (installment.status === "PAID") return "PAID";
  if (installment.status === "PARTIALLY_PAID") return "PARTIALLY_PAID";
  return installment.dueDate < new Date() ? "OVERDUE" : "PENDING";
}

export async function listPendingAndOverdueInstallments() {
  const installments = await db.installment.findMany({
    where: { status: { in: ["PENDING", "PARTIALLY_PAID"] } },
    include: { paymentPlan: { include: { student: true } } },
    orderBy: { dueDate: "asc" },
  });

  return installments.map((i) => ({ ...i, effectiveStatus: effectiveInstallmentStatus(i) }));
}

export async function paymentsSummary() {
  const [installments, monthlyPayments] = await Promise.all([
    db.installment.findMany({ where: { status: { in: ["PENDING", "PARTIALLY_PAID"] } } }),
    db.payment.findMany({
      where: { status: "PAID", paidAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) } },
    }),
  ]);

  const pendingAmount = installments
    .filter((i) => effectiveInstallmentStatus(i) === "PENDING" || effectiveInstallmentStatus(i) === "PARTIALLY_PAID")
    .reduce((sum, i) => sum + Number(i.amount), 0);
  const overdueAmount = installments.filter((i) => effectiveInstallmentStatus(i) === "OVERDUE").reduce((sum, i) => sum + Number(i.amount), 0);
  const collectedThisMonth = monthlyPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  return { pendingAmount, overdueAmount, collectedThisMonth };
}

export function listRecentPayments(limit = 20) {
  return db.payment.findMany({
    where: { status: "PAID" },
    include: { student: true },
    orderBy: { paidAt: "desc" },
    take: limit,
  });
}

const OVERVIEW_PAGE_SIZE = 15;

const UNPAID_STATUSES = ["PENDING", "PARTIALLY_PAID"] as const;

/** Every filter here is a real, independently-useful Prisma relational condition (not a
 * post-fetch JS filter) so it composes correctly with pagination — "page 2 of overdue Class 9
 * students" has to mean the actual 16th-30th such student, not the 16th-30th student overall
 * with non-overdue ones silently skipped. */
function buildPaymentOverviewWhere({
  q,
  academicLevelId,
  batchId,
  status,
}: {
  q?: string;
  academicLevelId?: string;
  batchId?: string;
  status?: string;
}) {
  const now = new Date();
  const hasOverdueInstallment = { paymentPlans: { some: { installments: { some: { status: { in: UNPAID_STATUSES }, dueDate: { lt: now } } } } } };
  const hasUnpaidInstallment = { paymentPlans: { some: { installments: { some: { status: { in: UNPAID_STATUSES } } } } } };
  const hasAnyPlan = { paymentPlans: { some: {} } };

  let statusFilter = {};
  if (status === "OVERDUE") statusFilter = hasOverdueInstallment;
  else if (status === "PENDING") statusFilter = { AND: [hasUnpaidInstallment, { NOT: hasOverdueInstallment }] };
  else if (status === "PAID_UP") statusFilter = { AND: [hasAnyPlan, { NOT: hasUnpaidInstallment }] };
  else if (status === "NO_PLAN") statusFilter = { paymentPlans: { none: {} } };

  return {
    ...(academicLevelId ? { academicLevelId } : {}),
    ...(batchId ? { batchMemberships: { some: { batchId } } } : {}),
    ...(q ? { fullName: { contains: q, mode: "insensitive" as const } } : {}),
    ...statusFilter,
  };
}

export interface StudentPaymentOverviewRow {
  studentId: string;
  fullName: string;
  studentCode: string;
  academicLevel: string | null;
  batch: string | null;
  planId: string | null;
  totalFee: number;
  totalPaid: number;
  remaining: number;
  overdueAmount: number;
  overdueCount: number;
  nextDue: { installmentId: string; amount: number; dueDate: Date } | null;
  status: "NO_PLAN" | "OVERDUE" | "PENDING" | "PAID_UP";
}

export async function listStudentsPaymentOverview({
  page = 1,
  q,
  academicLevelId,
  batchId,
  status,
}: {
  page?: number;
  q?: string;
  academicLevelId?: string;
  batchId?: string;
  status?: string;
}) {
  const where = buildPaymentOverviewWhere({ q, academicLevelId, batchId, status });

  const [students, total] = await Promise.all([
    db.student.findMany({
      where,
      include: {
        academicLevel: true,
        batchMemberships: { include: { batch: true }, take: 1 },
        paymentPlans: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { installments: { orderBy: { dueDate: "asc" } }, payments: { where: { status: "PAID" } } },
        },
      },
      orderBy: { fullName: "asc" },
      skip: (page - 1) * OVERVIEW_PAGE_SIZE,
      take: OVERVIEW_PAGE_SIZE,
    }),
    db.student.count({ where }),
  ]);

  const now = new Date();
  const items: StudentPaymentOverviewRow[] = students.map((s) => {
    const plan = s.paymentPlans[0];
    const batch = s.batchMemberships[0]?.batch.name ?? null;

    if (!plan) {
      return {
        studentId: s.id,
        fullName: s.fullName,
        studentCode: s.studentCode,
        academicLevel: s.academicLevel?.name ?? null,
        batch,
        planId: null,
        totalFee: 0,
        totalPaid: 0,
        remaining: 0,
        overdueAmount: 0,
        overdueCount: 0,
        nextDue: null,
        status: "NO_PLAN",
      };
    }

    const totalPaid = plan.payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalFee = Number(plan.totalFee);
    const unpaid = plan.installments.filter((i) => i.status !== "PAID").sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    const overdue = unpaid.filter((i) => i.dueDate < now);
    const overdueAmount = overdue.reduce((sum, i) => sum + Number(i.amount), 0);
    const next = unpaid[0] ?? null;

    return {
      studentId: s.id,
      fullName: s.fullName,
      studentCode: s.studentCode,
      academicLevel: s.academicLevel?.name ?? null,
      batch,
      planId: plan.id,
      totalFee,
      totalPaid,
      remaining: Math.max(0, totalFee - totalPaid),
      overdueAmount,
      overdueCount: overdue.length,
      nextDue: next ? { installmentId: next.id, amount: Number(next.amount), dueDate: next.dueDate } : null,
      status: overdue.length > 0 ? "OVERDUE" : unpaid.length > 0 ? "PENDING" : "PAID_UP",
    };
  });

  return { items, total, page, pageSize: OVERVIEW_PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / OVERVIEW_PAGE_SIZE)) };
}

/** Staff-triggered, on-demand version of the same reminder the scheduled job sends automatically
 * (src/lib/jobs/payment-reminders.ts) — reuses its exact channels/template so a manual nudge
 * looks identical to an automated one from the parent's side, but bypasses that job's
 * once-per-day-per-stage dedup marker since a staff member asking to send one now is a distinct,
 * deliberate action, not a duplicate of the schedule. */
export async function sendManualPaymentReminder(installmentId: string) {
  const installment = await db.installment.findUniqueOrThrow({
    where: { id: installmentId },
    include: { paymentPlan: { include: { student: true } } },
  });
  const student = installment.paymentPlan.student;
  const contacts = await recipients.getStudentContacts(student.id);
  const amount = formatPKR(installment.amount.toString());
  const overdue = installment.dueDate < new Date();
  const title = overdue ? "Payment overdue" : "Payment reminder";
  const message = overdue
    ? `${student.fullName}'s installment of ${amount} (due ${formatDate(installment.dueDate)}) is overdue. Please make payment at your earliest convenience.`
    : `Reminder: ${student.fullName}'s installment of ${amount} is due on ${formatDate(installment.dueDate)}.`;
  const variables = { student_name: student.fullName, payment_amount: amount, date: formatDate(installment.dueDate) };
  const parentUserIds = contacts.parents.map((p) => p.userId).filter((id): id is string => Boolean(id));

  await automationService.dispatchAlert({
    userIds: parentUserIds,
    notificationType: "PAYMENT_REMINDER",
    title,
    message,
    relatedEntityType: "Installment",
    relatedEntityId: installment.id,
    whatsapp: contacts.parents.map((p) => ({ phone: p.phone, userId: p.userId, templateKey: "PAYMENT_REMINDER", variables })),
    email: contacts.parents.filter((p) => p.email).map((p) => ({ email: p.email!, userId: p.userId, templateKey: "PAYMENT_REMINDER", variables })),
  });

  await automationService.logAutomation({
    ruleKey: "PAYMENT_REMINDER",
    studentId: student.id,
    action: `${title} — manually sent by staff`,
    details: { installmentId, manual: true },
  });

  return { parentsNotified: contacts.parents.length, studentId: student.id };
}

export async function countOverdueStudents() {
  return db.student.count({ where: buildPaymentOverviewWhere({ status: "OVERDUE" }) });
}

/** One reminder per overdue student, not per overdue installment — a student with two overdue
 * installments gets a single message (about the older one, same "oldest unpaid first" rule the
 * per-row Send Reminder button already uses), not two. Sequential, not Promise.all, same
 * precedent as the Communication Center's campaign sends: one bad phone number must never sink
 * the whole batch, and an academy-sized overdue list is small enough that this never costs
 * meaningful latency. */
export async function sendBulkOverdueReminders() {
  const now = new Date();
  const overdueInstallments = await db.installment.findMany({
    where: { status: { in: [...UNPAID_STATUSES] }, dueDate: { lt: now } },
    include: { paymentPlan: true },
    orderBy: { dueDate: "asc" },
  });

  const seenStudents = new Set<string>();
  const targetInstallmentIds: string[] = [];
  for (const installment of overdueInstallments) {
    const studentId = installment.paymentPlan.studentId;
    if (seenStudents.has(studentId)) continue;
    seenStudents.add(studentId);
    targetInstallmentIds.push(installment.id);
  }

  let studentsNotified = 0;
  let parentsNotified = 0;
  for (const installmentId of targetInstallmentIds) {
    try {
      const result = await sendManualPaymentReminder(installmentId);
      if (result.parentsNotified > 0) {
        studentsNotified += 1;
        parentsNotified += result.parentsNotified;
      }
    } catch (err) {
      console.error("Bulk overdue reminder failed for one student", err);
    }
  }

  return { studentsProcessed: targetInstallmentIds.length, studentsNotified, parentsNotified };
}
