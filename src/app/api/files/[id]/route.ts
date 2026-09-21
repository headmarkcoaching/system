import { NextRequest, NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { STAFF_ROLES } from "@/lib/permissions";
import { assertCanManageBatch, assertCanManageSupportTicket, assertCanManageLead } from "@/lib/access";
import * as uploadedFilesService from "@/lib/services/uploaded-files";

/** Files are never served from a public path — every read re-checks the same access rule as
 * the record that references this file, so a guessed/leaked file id alone is never enough. */
async function assertCanReadFile(session: Session, fileId: string, purpose: string) {
  if (STAFF_ROLES.includes(session.user.role)) return;

  // Profile photos are directory-style info, not a sensitive document — any signed-in user
  // (already required above) can view one, same as they'd see a name or batch badge.
  if (purpose === "PROFILE_PHOTO") return;

  if (purpose === "HOMEWORK_SUBMISSION") {
    const submission = await db.homeworkSubmission.findFirst({
      where: { attachmentFileId: fileId },
      select: { studentId: true, homework: { select: { batchId: true } } },
    });
    if (!submission) throw new Error("Not found");

    if (session.user.role === "STUDENT") {
      const student = await db.student.findUnique({ where: { userId: session.user.id }, select: { id: true } });
      if (student?.id === submission.studentId) return;
    }
    if (session.user.role === "TEACHER") {
      await assertCanManageBatch(session, submission.homework.batchId);
      return;
    }
    throw new Error("Forbidden");
  }

  if (purpose === "SUPPORT_ATTACHMENT") {
    const ticket = await db.supportTicket.findFirst({ where: { attachmentFileId: fileId }, select: { id: true } });
    if (!ticket) throw new Error("Not found");
    await assertCanManageSupportTicket(session, ticket.id);
    return;
  }

  if (purpose === "PAYMENT_RECEIPT") {
    const payment = await db.payment.findFirst({ where: { receiptFileId: fileId }, select: { studentId: true } });
    if (!payment) throw new Error("Not found");

    if (session.user.role === "STUDENT") {
      const student = await db.student.findUnique({ where: { userId: session.user.id }, select: { id: true } });
      if (student?.id === payment.studentId) return;
    }
    if (session.user.role === "PARENT") {
      const parent = await db.parent.findUnique({ where: { userId: session.user.id }, select: { id: true } });
      if (parent) {
        const link = await db.studentParentRelationship.findFirst({ where: { studentId: payment.studentId, parentId: parent.id } });
        if (link) return;
      }
    }
    throw new Error("Forbidden");
  }

  if (purpose === "LEAD_ASSESSMENT") {
    const assessment = await db.assessment.findFirst({ where: { documentFileId: fileId }, select: { leadId: true } });
    if (!assessment) throw new Error("Not found");
    await assertCanManageLead(session, assessment.leadId);
    return;
  }

  // Deliberately no PARENT branch here — parents are not meant to see study material at all,
  // private-material-wise, same reasoning as recordings; a student can read their own level's
  // material, nobody else (STAFF_ROLES already returned true above, before this function is
  // even reached for staff).
  if (purpose === "STUDY_MATERIAL") {
    const material = await db.studyMaterial.findFirst({ where: { fileId }, select: { academicLevelId: true } });
    if (!material) throw new Error("Not found");
    if (session.user.role === "STUDENT") {
      const student = await db.student.findUnique({ where: { userId: session.user.id }, select: { academicLevelId: true } });
      if (student?.academicLevelId === material.academicLevelId) return;
    }
    throw new Error("Forbidden");
  }

  if (purpose === "NOTES_SUBSCRIPTION_RECEIPT") {
    const payment = await db.notesSubscriptionPayment.findFirst({
      where: { receiptFileId: fileId },
      select: { subscription: { select: { studentId: true } } },
    });
    if (!payment) throw new Error("Not found");

    if (session.user.role === "STUDENT") {
      const student = await db.student.findUnique({ where: { userId: session.user.id }, select: { id: true } });
      if (student?.id === payment.subscription.studentId) return;
    }
    if (session.user.role === "PARENT") {
      const parent = await db.parent.findUnique({ where: { userId: session.user.id }, select: { id: true } });
      if (parent) {
        const link = await db.studentParentRelationship.findFirst({ where: { studentId: payment.subscription.studentId, parentId: parent.id } });
        if (link) return;
      }
    }
    throw new Error("Forbidden");
  }

  throw new Error("Forbidden");
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const file = await uploadedFilesService.getUploadedFile(params.id);
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await assertCanReadFile(session, file.id, file.purpose);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const result = await uploadedFilesService.readFileBytes(file.id);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": result.file.mimeType,
      "Content-Disposition": `inline; filename="${result.file.filename.replace(/"/g, "")}"`,
    },
  });
}

export const dynamic = "force-dynamic";
