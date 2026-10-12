"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession, requireRoleSession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { getDoubtAccess } from "@/lib/communication-access";
import * as doubtService from "@/lib/services/doubts";
import * as staffService from "@/lib/services/staff";
import * as studentService from "@/lib/services/students";
import * as automationService from "@/lib/services/automation";
import * as uploadedFilesService from "@/lib/services/uploaded-files";

export interface DoubtActionResult {
  error?: string;
  doubtId?: string;
}

const MAX_BODY = 2000;

const askSchema = z.object({
  subjectId: z.string().min(1, "Please choose a subject"),
  chapter: z.string().trim().max(120).optional(),
  title: z.string().trim().min(3, "Give your doubt a short title").max(140, "Keep the title under 140 characters"),
  body: z.string().trim().min(5, "Describe your doubt so the teacher can help").max(MAX_BODY, `Keep it under ${MAX_BODY} characters`),
});

const replySchema = z.object({
  body: z.string().trim().min(1, "Write a reply first").max(MAX_BODY, `Keep it under ${MAX_BODY} characters`),
});

async function saveOptionalFile(formData: FormData, userId: string) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { fileId: undefined };
  try {
    const uploaded = await uploadedFilesService.uploadFile({ file, purpose: "DOUBT_ATTACHMENT", uploadedById: userId });
    return { fileId: uploaded.id };
  } catch (err) {
    if (err instanceof uploadedFilesService.FileValidationError) return { error: err.message };
    throw err;
  }
}

function refresh(doubtId?: string) {
  revalidatePath("/student/doubts");
  revalidatePath("/teacher/doubts");
  revalidatePath("/admin/doubts");
  if (doubtId) revalidatePath(`/doubts/${doubtId}`);
}

export async function createDoubtAction(formData: FormData): Promise<DoubtActionResult> {
  const session = await requireRoleSession(["STUDENT"]);
  const parsed = askSchema.safeParse(Object.fromEntries(Array.from(formData.entries()).filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const rate = await checkRateLimit(`doubt:new:${session.user.id}`, { windowMs: 60 * 60 * 1000, max: 10 });
  if (!rate.allowed) return { error: "You've asked a lot of doubts in the last hour. Please wait a little before asking another." };

  const student = await studentService.getStudentByUserId(session.user.id);
  if (!student) return { error: "Your student profile was not found." };

  const askable = (await doubtService.listAskableSubjects(student.id)).find((s) => s.subjectId === parsed.data.subjectId);
  if (!askable) return { error: "That subject is not part of your batch." };

  const upload = await saveOptionalFile(formData, session.user.id);
  if (upload.error) return { error: upload.error };

  const doubt = await doubtService.createDoubt({
    studentId: student.id,
    batchId: askable.batchId,
    subjectId: askable.subjectId,
    chapter: parsed.data.chapter || undefined,
    title: parsed.data.title,
    body: parsed.data.body,
    attachmentFileId: upload.fileId,
  });

  try {
    const teachers = await doubtService.listTeachersForBatchSubject(askable.batchId, askable.subjectId);
    // With no teacher assigned to this subject, the question goes to the admin office instead of waiting unseen.
    const userIds = teachers.length > 0 ? teachers.map((t) => t.teacher.userId) : await staffService.listAdminUserIds();
    await automationService.dispatchAlert({
      userIds,
      notificationType: "DOUBT_UPDATE",
      title: "New student doubt",
      message: `${student.fullName} asked in ${askable.subjectName}: ${doubt.title}`,
      relatedEntityType: "Doubt",
      relatedEntityId: doubt.id,
    });
  } catch (err) {
    console.error("doubt creation notification failed", err);
  }

  refresh(doubt.id);
  return { doubtId: doubt.id };
}

export async function replyDoubtAction(doubtId: string, formData: FormData): Promise<DoubtActionResult> {
  const session = await requireSession();
  const { doubt, viewer } = await getDoubtAccess(session, doubtId);

  const parsed = replySchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const rate = await checkRateLimit(`doubt:reply:${session.user.id}`, { windowMs: 60 * 60 * 1000, max: 40 });
  if (!rate.allowed) return { error: "You're replying very quickly. Please wait a few minutes." };

  const upload = await saveOptionalFile(formData, session.user.id);
  if (upload.error) return { error: upload.error };

  await doubtService.addReply({ doubtId, authorId: session.user.id, body: parsed.data.body, attachmentFileId: upload.fileId });

  const now = new Date();
  if (viewer === "student") {
    // A follow-up question puts the doubt back in the teacher's queue, even if it was marked resolved.
    await doubtService.updateDoubt(doubtId, { status: "OPEN", resolvedAt: null, lastActivityAt: now });
  } else {
    await doubtService.updateDoubt(doubtId, {
      status: "ANSWERED",
      lastActivityAt: now,
      ...(doubt.firstResponseAt ? {} : { firstResponseAt: now }),
    });
  }

  try {
    let recipientIds: string[] = [];
    if (viewer === "student") {
      const teachers = await doubtService.listTeachersForBatchSubject(doubt.batchId, doubt.subjectId);
      recipientIds = teachers.length > 0 ? teachers.map((t) => t.teacher.userId) : await staffService.listAdminUserIds();
    } else {
      const asker = await db.student.findUnique({ where: { id: doubt.studentId }, select: { userId: true } });
      if (asker?.userId) recipientIds = [asker.userId];
    }
    await automationService.dispatchAlert({
      userIds: recipientIds.filter((id) => id !== session.user.id),
      notificationType: "DOUBT_UPDATE",
      title: viewer === "student" ? "Follow-up on a doubt" : "Your doubt was answered",
      message: `${session.user.name} replied on: ${doubt.title}`,
      relatedEntityType: "Doubt",
      relatedEntityId: doubtId,
    });
  } catch (err) {
    console.error("doubt reply notification failed", err);
  }

  refresh(doubtId);
  return { doubtId };
}

export async function resolveDoubtAction(doubtId: string): Promise<DoubtActionResult> {
  const session = await requireSession();
  await getDoubtAccess(session, doubtId);
  await doubtService.updateDoubt(doubtId, { status: "RESOLVED", resolvedAt: new Date(), lastActivityAt: new Date() });
  refresh(doubtId);
  return { doubtId };
}
