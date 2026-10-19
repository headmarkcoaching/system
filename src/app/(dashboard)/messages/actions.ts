"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession, requireRoleSession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";
import { guardContactDetails } from "@/lib/contact-guard";
import { getThreadAccess } from "@/lib/communication-access";
import * as teacherMessageService from "@/lib/services/teacher-messages";
import * as automationService from "@/lib/services/automation";
import * as uploadedFilesService from "@/lib/services/uploaded-files";

export interface MessageActionResult {
  error?: string;
  threadId?: string;
}

const MAX_BODY = 2000;

const startSchema = z.object({
  teacherId: z.string().min(1, "Please choose a teacher"),
  studentId: z.string().min(1, "Please choose a child"),
  subject: z.string().trim().min(3, "Give your message a short subject").max(120, "Keep the subject under 120 characters"),
  body: z.string().trim().min(2, "Write your message first").max(MAX_BODY, `Keep it under ${MAX_BODY} characters`),
});

const replySchema = z.object({
  body: z.string().trim().min(1, "Write a message first").max(MAX_BODY, `Keep it under ${MAX_BODY} characters`),
});

async function saveOptionalFile(formData: FormData, userId: string) {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { fileId: undefined };
  try {
    const uploaded = await uploadedFilesService.uploadFile({ file, purpose: "MESSAGE_ATTACHMENT", uploadedById: userId });
    return { fileId: uploaded.id };
  } catch (err) {
    if (err instanceof uploadedFilesService.FileValidationError) return { error: err.message };
    throw err;
  }
}

function refresh(threadId?: string) {
  for (const path of ["/parent/messages", "/student/messages", "/teacher/messages", "/admin/doubts"]) revalidatePath(path);
  if (threadId) revalidatePath(`/messages/${threadId}`);
}

/** A parent may write about any child linked to them; a student only about themselves. */
async function canWriteAbout(userId: string, role: string, studentId: string) {
  if (role === "STUDENT") {
    const student = await db.student.findUnique({ where: { userId }, select: { id: true } });
    return student?.id === studentId;
  }
  if (role === "PARENT") {
    const parent = await db.parent.findUnique({ where: { userId }, select: { id: true } });
    if (!parent) return false;
    const link = await db.studentParentRelationship.findFirst({ where: { parentId: parent.id, studentId }, select: { id: true } });
    return !!link;
  }
  return false;
}

export async function startThreadAction(formData: FormData): Promise<MessageActionResult> {
  const session = await requireRoleSession(["PARENT", "STUDENT"]);
  const parsed = startSchema.safeParse(Object.fromEntries(Array.from(formData.entries()).filter(([, v]) => typeof v === "string")));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const blocked = await guardContactDetails({ id: session.user.id, role: session.user.role }, "Message to teacher", parsed.data.subject, parsed.data.body);
  if (blocked) return { error: blocked };

  if (!(await canWriteAbout(session.user.id, session.user.role, parsed.data.studentId))) {
    return { error: "You can only write about your own child." };
  }
  if (!(await teacherMessageService.teacherTeachesStudent(parsed.data.teacherId, parsed.data.studentId))) {
    return { error: "That teacher doesn't teach this student." };
  }

  const rate = await checkRateLimit(`thread:new:${session.user.id}`, { windowMs: 60 * 60 * 1000, max: 5 });
  if (!rate.allowed) return { error: "You've started several conversations in the last hour. Please wait a little, or continue an existing one." };

  const upload = await saveOptionalFile(formData, session.user.id);
  if (upload.error) return { error: upload.error };

  const thread = await teacherMessageService.createThread({
    teacherId: parsed.data.teacherId,
    studentId: parsed.data.studentId,
    startedById: session.user.id,
    subject: parsed.data.subject,
    body: parsed.data.body,
    attachmentFileId: upload.fileId,
  });

  try {
    const [teacher, student] = await Promise.all([
      db.teacher.findUnique({ where: { id: parsed.data.teacherId }, select: { userId: true } }),
      db.student.findUnique({ where: { id: parsed.data.studentId }, select: { fullName: true } }),
    ]);
    if (teacher) {
      await automationService.dispatchAlert({
        userIds: [teacher.userId],
        notificationType: "TEACHER_MESSAGE",
        title: "New message",
        message: `${session.user.name} wrote about ${student?.fullName ?? "a student"}: ${parsed.data.subject}`,
        relatedEntityType: "TeacherThread",
        relatedEntityId: thread.id,
      });
    }
  } catch (err) {
    console.error("thread notification failed", err);
  }

  refresh(thread.id);
  return { threadId: thread.id };
}

export async function replyThreadAction(threadId: string, formData: FormData): Promise<MessageActionResult> {
  const session = await requireSession();
  const { thread, viewer } = await getThreadAccess(session, threadId);
  // Admins can read a conversation for oversight but cannot post in it; parents reach the office through Support.
  if (viewer === "admin") return { error: "Admins can read this conversation but not reply to it." };

  const parsed = replySchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const blocked = await guardContactDetails({ id: session.user.id, role: session.user.role }, "Message reply", parsed.data.body);
  if (blocked) return { error: blocked };

  const rate = await checkRateLimit(`thread:reply:${session.user.id}`, { windowMs: 60 * 60 * 1000, max: 40 });
  if (!rate.allowed) return { error: "You're sending messages very quickly. Please wait a few minutes." };

  const upload = await saveOptionalFile(formData, session.user.id);
  if (upload.error) return { error: upload.error };

  await teacherMessageService.addMessage({ threadId, authorId: session.user.id, side: viewer, body: parsed.data.body, attachmentFileId: upload.fileId });

  try {
    let recipientId: string | null = null;
    if (viewer === "family") {
      const teacher = await db.teacher.findUnique({ where: { id: thread.teacherId }, select: { userId: true } });
      recipientId = teacher?.userId ?? null;
    } else {
      recipientId = thread.startedById;
    }
    if (recipientId && recipientId !== session.user.id) {
      await automationService.dispatchAlert({
        userIds: [recipientId],
        notificationType: "TEACHER_MESSAGE",
        title: "New message",
        message: `${session.user.name} replied in a conversation`,
        relatedEntityType: "TeacherThread",
        relatedEntityId: threadId,
      });
    }
  } catch (err) {
    console.error("thread reply notification failed", err);
  }

  refresh(threadId);
  return { threadId };
}

export async function markThreadReadAction(threadId: string) {
  const session = await requireSession();
  const { viewer } = await getThreadAccess(session, threadId);
  if (viewer === "admin") return;
  await teacherMessageService.markRead(threadId, viewer);
  refresh();
}
