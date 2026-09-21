import "server-only";
import { db } from "@/lib/db";
import type { KnowledgeDocType, KnowledgeDocStatus } from "@prisma/client";

export interface CreateKnowledgeDocumentInput {
  title: string;
  docType: KnowledgeDocType;
  academicLevelId?: string | null;
  boardId?: string | null;
  groupId?: string | null;
  subjectId?: string | null;
  chapter?: string | null;
  topic?: string | null;
  sourceUrl?: string | null;
  content: string;
  uploadedById: string;
}

export function listKnowledgeDocuments(filters: { status?: KnowledgeDocStatus } = {}) {
  return db.knowledgeDocument.findMany({
    where: filters.status ? { status: filters.status } : {},
    include: { academicLevel: true, board: true, group: true, subject: true, uploadedBy: true, reviewedBy: true },
    orderBy: { createdAt: "desc" },
  });
}

/** Documents relevant to one specific batch — the same "null means applies to all" scoping
 * `findRelevantDocuments` uses for the student-facing AI, but staff-facing (every status shown,
 * not just APPROVED, so pending/rejected docs are still visible for review) and matching
 * against every subject taught in the batch rather than a single subject. `subjectIds` should
 * already be narrowed to the viewing teacher's own subject(s) when they're not staff — this
 * function itself doesn't know who's asking, just what to match against. */
export function listDocumentsForBatch(batch: { academicLevelId: string; boardId?: string | null; groupId?: string | null }, subjectIds: string[]) {
  return db.knowledgeDocument.findMany({
    where: {
      AND: [
        scopeFilter("academicLevelId", batch.academicLevelId),
        scopeFilter("boardId", batch.boardId),
        scopeFilter("groupId", batch.groupId),
        { OR: [{ subjectId: null }, { subjectId: { in: subjectIds } }] },
      ],
    },
    include: { subject: true, uploadedBy: true, reviewedBy: true },
    orderBy: { createdAt: "desc" },
  });
}

export function createKnowledgeDocument(input: CreateKnowledgeDocumentInput) {
  return db.knowledgeDocument.create({ data: input });
}

export function reviewKnowledgeDocument(id: string, reviewedById: string, status: "APPROVED" | "REJECTED") {
  return db.knowledgeDocument.update({ where: { id }, data: { status, reviewedById, reviewedAt: new Date() } });
}

export function deleteKnowledgeDocument(id: string) {
  return db.knowledgeDocument.delete({ where: { id } });
}

export interface StudentAIScope {
  academicLevelId: string;
  boardId?: string | null;
  groupId?: string | null;
  subjectId?: string | null; // optional hint from the chat UI's subject picker
}

export interface RankedDocument {
  id: string;
  title: string;
  content: string;
  chapter: string | null;
  score: number;
}

const STOPWORDS = new Set(["the", "a", "an", "is", "are", "was", "were", "of", "to", "in", "on", "for", "and", "or", "what", "why", "how", "does", "do", "explain"]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/** Null on a document means "applies to all" (matches the existing Subject.academicLevelId
 * convention). If the student themself has no value for a dimension (e.g. no board set),
 * only "applies to all" documents in that dimension match — a document scoped to a
 * specific board should not leak to a student who isn't tied to any board. */
function scopeFilter(field: "academicLevelId" | "boardId" | "groupId" | "subjectId", value?: string | null) {
  return value ? { OR: [{ [field]: null }, { [field]: value }] } : { [field]: null };
}

/**
 * Placeholder for a future embeddings/vector-search (RAG) pipeline — explicitly NOT real
 * vector search. Filters to APPROVED, in-scope documents, then ranks by keyword/word-overlap
 * between the question and title+content. Swap the ranking body for a real similarity search
 * later without touching callers (findRelevantDocuments signature stays stable).
 */
export async function findRelevantDocuments(question: string, scope: StudentAIScope, limit = 3): Promise<RankedDocument[]> {
  const candidates = await db.knowledgeDocument.findMany({
    where: {
      status: "APPROVED",
      AND: [
        scopeFilter("academicLevelId", scope.academicLevelId),
        scopeFilter("boardId", scope.boardId),
        scopeFilter("groupId", scope.groupId),
        ...(scope.subjectId ? [scopeFilter("subjectId", scope.subjectId)] : []),
      ],
    },
    select: { id: true, title: true, content: true, chapter: true },
  });

  const qWords = tokenize(question);
  if (qWords.length === 0) return [];

  const scored = candidates
    .map((doc) => {
      const bodyWords = new Set(tokenize(doc.content));
      const titleWords = tokenize(doc.title);
      const bodyOverlap = qWords.filter((w) => bodyWords.has(w)).length;
      const titleOverlap = qWords.filter((w) => titleWords.includes(w)).length * 2; // title matches weighted higher
      return { ...doc, score: bodyOverlap + titleOverlap };
    })
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}
