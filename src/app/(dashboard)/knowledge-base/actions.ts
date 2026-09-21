"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { ACADEMIC_STAFF_ROLES, KNOWLEDGE_BASE_REVIEWER_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as kbService from "@/lib/services/knowledge-base";

const schema = z.object({
  title: z.string().min(2, "Title is required"),
  docType: z.enum(["PDF", "NOTES", "TEXT", "STUDY_GUIDE", "PAST_PAPER", "TEACHER_CONTENT"]),
  academicLevelId: z.string().optional(),
  boardId: z.string().optional(),
  groupId: z.string().optional(),
  subjectId: z.string().optional(),
  chapter: z.string().optional(),
  topic: z.string().optional(),
  sourceUrl: z.string().url("Enter a valid link").optional().or(z.literal("")),
  content: z.string().min(20, "Paste the document's text content (at least 20 characters) — this is what the AI reads."),
});

function revalidateKnowledgeBase(batchId?: string) {
  revalidatePath("/knowledge-base");
  if (batchId) revalidatePath(`/knowledge-base/${batchId}`);
}

export async function createKnowledgeDocumentAction(data: Record<string, unknown>, batchId?: string) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const record = await kbService.createKnowledgeDocument({
    ...parsed.data,
    academicLevelId: parsed.data.academicLevelId || null,
    boardId: parsed.data.boardId || null,
    groupId: parsed.data.groupId || null,
    subjectId: parsed.data.subjectId || null,
    sourceUrl: parsed.data.sourceUrl || null,
    uploadedById: session.user.id,
  });
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "KnowledgeDocument", entityId: record.id, after: record });
  revalidateKnowledgeBase(batchId);
}

export async function reviewKnowledgeDocumentAction(id: string, status: "APPROVED" | "REJECTED", batchId?: string) {
  // Only Counselor/Admin/Super Admin approve or reject — never the teacher who uploaded it
  // (or any other teacher), even though teachers can upload via ACADEMIC_STAFF_ROLES above.
  const session = await requireRoleSession(KNOWLEDGE_BASE_REVIEWER_ROLES);
  const record = await kbService.reviewKnowledgeDocument(id, session.user.id, status);
  await logAudit({ actorId: session.user.id, action: "STATUS_CHANGE", entityType: "KnowledgeDocument", entityId: id, after: { status } });
  revalidateKnowledgeBase(batchId);
  return record;
}

export async function deleteKnowledgeDocumentAction(id: string, batchId?: string) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  await kbService.deleteKnowledgeDocument(id);
  await logAudit({ actorId: session.user.id, action: "DELETE", entityType: "KnowledgeDocument", entityId: id });
  revalidateKnowledgeBase(batchId);
}
