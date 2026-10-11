"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRoleSession } from "@/lib/session";
import { ACADEMIC_STAFF_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import * as bank from "@/lib/services/question-bank";
import * as questionGeneration from "@/lib/services/question-generation";
import * as uploadedFilesService from "@/lib/services/uploaded-files";
import type { FieldValue } from "@/components/shared/entity-dialog";

type Result = { error?: string };
type FormValues = Record<string, FieldValue>;

function refresh() {
  revalidatePath("/question-bank");
  revalidatePath("/student/practice");
}

function fail(err: unknown, fallback: string): Result {
  return { error: err instanceof Error ? err.message : fallback };
}

/** Teachers pick a chapter; its subject follows from it, so the two can never disagree. */
async function subjectOfChapter(chapterId: string) {
  const chapter = await db.chapter.findUnique({ where: { id: chapterId }, select: { subjectId: true } });
  return chapter?.subjectId ?? null;
}

// ---- Chapters ----

const chapterSchema = z.object({
  subjectId: z.string().min(1, "Choose a subject"),
  academicLevelId: z.string().min(1, "Choose a class"),
  boardId: z.string().optional(),
  number: z.coerce.number().int().min(1, "Chapter number must be 1 or more").max(100),
  title: z.string().trim().min(2, "Give the chapter a title").max(160),
});

export async function createChapterAction(data: FormValues): Promise<Result> {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  const parsed = chapterSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const chapter = await bank.createChapter({ ...parsed.data, boardId: parsed.data.boardId || undefined });
    await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "Chapter", entityId: chapter.id, after: chapter });
    refresh();
    return {};
  } catch (err) {
    return fail(err, "Couldn't add the chapter.");
  }
}

export async function updateChapterAction(id: string, data: FormValues): Promise<Result> {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  const parsed = chapterSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const chapter = await bank.updateChapter(id, { ...parsed.data, boardId: parsed.data.boardId || undefined });
    await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "Chapter", entityId: id, after: chapter });
    refresh();
    return {};
  } catch (err) {
    return fail(err, "Couldn't update the chapter.");
  }
}

export async function deleteChapterAction(id: string): Promise<Result> {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  try {
    await bank.deleteChapter(id);
    await logAudit({ actorId: session.user.id, action: "DELETE", entityType: "Chapter", entityId: id });
    refresh();
    return {};
  } catch (err) {
    return fail(err, "Couldn't delete the chapter.");
  }
}

// ---- Questions ----

const questionSchema = z.object({
  chapterId: z.string().min(1, "Choose a chapter"),
  type: z.enum(["MCQ", "SHORT_ANSWER", "LONG_ANSWER", "NUMERICAL"]),
  questionText: z.string().trim().min(5, "Write the question").max(2000),
  optionsText: z.string().optional(),
  correctAnswer: z.string().trim().max(2000).optional(),
  explanation: z.string().trim().max(3000).optional(),
  marks: z.coerce.number().int().min(1, "Marks must be at least 1").max(50),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  topic: z.string().trim().max(120).optional(),
  status: z.enum(["DRAFT", "APPROVED"]).optional(),
  pastPaperId: z.string().optional(),
  paperOrder: z.coerce.number().int().min(0).max(500).optional(),
});

function toQuestionInput(d: z.infer<typeof questionSchema>, subjectId: string, createdById?: string): bank.QuestionInput {
  return {
    subjectId,
    chapterId: d.chapterId,
    type: d.type,
    questionText: d.questionText,
    options: d.type === "MCQ" ? (d.optionsText ?? "").split("\n").map((o) => o.trim()).filter(Boolean) : undefined,
    correctAnswer: d.correctAnswer || undefined,
    explanation: d.explanation || undefined,
    marks: d.marks,
    difficulty: d.difficulty,
    topic: d.topic || undefined,
    status: d.status,
    pastPaperId: d.pastPaperId || undefined,
    paperOrder: d.paperOrder,
    createdById,
  };
}

export async function createQuestionAction(data: FormValues): Promise<Result> {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  const parsed = questionSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const subjectId = await subjectOfChapter(parsed.data.chapterId);
    if (!subjectId) return { error: "That chapter no longer exists." };
    const q = await bank.createQuestion(toQuestionInput(parsed.data, subjectId, session.user.id));
    await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "BankQuestion", entityId: q.id });
    refresh();
    return {};
  } catch (err) {
    return fail(err, "Couldn't add the question.");
  }
}

export async function updateQuestionAction(id: string, data: FormValues): Promise<Result> {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  const parsed = questionSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const subjectId = await subjectOfChapter(parsed.data.chapterId);
    if (!subjectId) return { error: "That chapter no longer exists." };
    await bank.updateQuestion(id, toQuestionInput(parsed.data, subjectId));
    await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "BankQuestion", entityId: id });
    refresh();
    return {};
  } catch (err) {
    return fail(err, "Couldn't update the question.");
  }
}

export async function setQuestionStatusAction(id: string, status: "DRAFT" | "APPROVED" | "ARCHIVED"): Promise<Result> {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  try {
    await bank.setQuestionStatus(id, status);
    await logAudit({ actorId: session.user.id, action: "STATUS_CHANGE", entityType: "BankQuestion", entityId: id, after: { status } });
    refresh();
    return {};
  } catch (err) {
    return fail(err, "Couldn't change the status.");
  }
}

export async function deleteQuestionAction(id: string): Promise<Result> {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  try {
    await bank.deleteQuestion(id);
    await logAudit({ actorId: session.user.id, action: "DELETE", entityType: "BankQuestion", entityId: id });
    refresh();
    return {};
  } catch (err) {
    return fail(err, "Couldn't delete the question.");
  }
}

const importSchema = z.object({
  chapterId: z.string().min(1, "Choose the default chapter"),
  pastPaperId: z.string().optional(),
  text: z.string().trim().min(10, "Paste the questions first").max(60000),
});

/** All or nothing: if any pasted question can't be read, nothing is saved and the problems are
 * listed, so a teacher never ends up with half a paper imported and no idea which half. */
export async function importQuestionsAction(data: FormValues): Promise<Result> {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  const parsed = importSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { questions, problems } = bank.parseImportText(parsed.data.text);
  if (problems.length > 0) return { error: `Nothing was imported. ${problems.slice(0, 3).join(" ")}${problems.length > 3 ? ` (+${problems.length - 3} more)` : ""}` };
  if (questions.length === 0) return { error: "No questions found. Separate each question with a line containing only ---." };
  if (questions.length > 100) return { error: "Please import at most 100 questions at a time." };

  const defaultChapter = await db.chapter.findUnique({ where: { id: parsed.data.chapterId } });
  if (!defaultChapter) return { error: "That chapter no longer exists." };

  try {
    let order = 1;
    for (const q of questions) {
      let chapterId = defaultChapter.id;
      if (q.chapterNumber !== null) {
        const other = await db.chapter.findFirst({
          where: { subjectId: defaultChapter.subjectId, academicLevelId: defaultChapter.academicLevelId, boardId: defaultChapter.boardId, number: q.chapterNumber },
          select: { id: true },
        });
        if (!other) return { error: `A question names Chapter ${q.chapterNumber}, which doesn't exist for this class yet. Nothing was imported.` };
        chapterId = other.id;
      }
      await bank.createQuestion({
        subjectId: defaultChapter.subjectId,
        chapterId,
        type: q.type,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        marks: q.marks,
        difficulty: q.difficulty,
        topic: q.topic,
        status: "DRAFT",
        pastPaperId: parsed.data.pastPaperId || undefined,
        paperOrder: parsed.data.pastPaperId ? order++ : undefined,
        createdById: session.user.id,
      });
    }
    await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "BankQuestion", entityId: "bulk-import", after: { count: questions.length } });
    refresh();
    return {};
  } catch (err) {
    return fail(err, "The import stopped part-way. Check the questions list for what was saved.");
  }
}

const aiSchema = z.object({
  chapterId: z.string().min(1, "Choose a chapter"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  type: z.enum(["MIXED", "MCQ", "SHORT_ANSWER", "LONG_ANSWER", "NUMERICAL"]),
  count: z.coerce.number().int().min(1).max(questionGeneration.MAX_QUESTIONS),
});

export async function aiDraftQuestionsAction(data: FormValues): Promise<Result> {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  const parsed = aiSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const rate = checkRateLimit(`bank:ai:${session.user.id}`, { windowMs: 60 * 60 * 1000, max: 20 });
  if (!rate.allowed) return { error: "You've generated a lot of drafts this hour. Please try again later." };

  const chapter = await db.chapter.findUnique({ where: { id: parsed.data.chapterId }, include: { academicLevel: true, subject: true } });
  if (!chapter) return { error: "That chapter no longer exists." };

  try {
    const drafts = await questionGeneration.generateQuestionDrafts({
      academicLevelId: chapter.academicLevelId,
      academicLevelName: chapter.academicLevel.name,
      subjectId: chapter.subjectId,
      subjectName: chapter.subject.name,
      chapter: `Chapter ${chapter.number}: ${chapter.title}`,
      difficulty: parsed.data.difficulty,
      type: parsed.data.type,
      count: parsed.data.count,
      requestedByUserId: session.user.id,
    });
    if (drafts.length === 0) return { error: "The AI didn't return any usable questions. If AI isn't switched on for your academy, add questions by hand or paste them in." };

    let saved = 0;
    for (const d of drafts) {
      try {
        await bank.createQuestion({
          subjectId: chapter.subjectId,
          chapterId: chapter.id,
          type: d.type,
          questionText: d.questionText,
          options: d.options,
          correctAnswer: d.correctAnswer,
          marks: d.marks,
          difficulty: parsed.data.difficulty.toUpperCase() as "EASY" | "MEDIUM" | "HARD",
          topic: d.topic,
          source: "AI_DRAFT",
          status: "DRAFT",
          createdById: session.user.id,
        });
        saved++;
      } catch {
        /* A draft with a missing or mismatched answer is skipped rather than saved broken. */
      }
    }
    if (saved === 0) return { error: "The AI's questions were missing valid answers, so none were saved. Try again." };
    await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "BankQuestion", entityId: "ai-draft", after: { count: saved } });
    refresh();
    return {};
  } catch (err) {
    return fail(err, "Couldn't generate drafts.");
  }
}

// ---- Past papers ----

const paperSchema = z.object({
  subjectId: z.string().min(1, "Choose a subject"),
  academicLevelId: z.string().min(1, "Choose a class"),
  boardId: z.string().optional(),
  year: z.coerce.number().int().min(1990, "Enter a valid year").max(new Date().getFullYear() + 1),
  session: z.enum(["ANNUAL", "SUPPLEMENTARY", "MODEL"]),
  title: z.string().trim().min(3, "Give the paper a title").max(160),
  totalMarks: z.coerce.number().int().min(1).max(500),
  durationMinutes: z.coerce.number().int().min(5, "At least 5 minutes").max(480),
});

export async function createPastPaperAction(data: FormValues): Promise<Result> {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  const parsed = paperSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const paper = await bank.createPastPaper({ ...parsed.data, boardId: parsed.data.boardId || undefined, createdById: session.user.id });
    await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "PastPaper", entityId: paper.id, after: paper });
    refresh();
    return {};
  } catch (err) {
    return fail(err, "Couldn't add the paper.");
  }
}

export async function updatePastPaperAction(id: string, data: FormValues): Promise<Result> {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  const parsed = paperSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    await bank.updatePastPaper(id, { ...parsed.data, boardId: parsed.data.boardId || undefined });
    await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "PastPaper", entityId: id });
    refresh();
    return {};
  } catch (err) {
    return fail(err, "Couldn't update the paper.");
  }
}

export async function setPastPaperPublishedAction(id: string, published: boolean): Promise<Result> {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  try {
    if (published) {
      const paper = await db.pastPaper.findUnique({ where: { id }, select: { fileId: true, _count: { select: { questions: { where: { status: "APPROVED" } } } } } });
      if (!paper || (!paper.fileId && paper._count.questions === 0)) return { error: "Add the paper's PDF or at least one approved question before publishing it." };
    }
    await bank.setPastPaperPublished(id, published);
    await logAudit({ actorId: session.user.id, action: "STATUS_CHANGE", entityType: "PastPaper", entityId: id, after: { published } });
    refresh();
    return {};
  } catch (err) {
    return fail(err, "Couldn't change the paper.");
  }
}

export async function deletePastPaperAction(id: string): Promise<Result> {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  try {
    await bank.deletePastPaper(id);
    await logAudit({ actorId: session.user.id, action: "DELETE", entityType: "PastPaper", entityId: id });
    refresh();
    return {};
  } catch (err) {
    return fail(err, "Couldn't delete the paper.");
  }
}

/** The paper itself, as a PDF or image students can open. Only PDF and images are accepted. */
export async function uploadPastPaperFileAction(paperId: string, formData: FormData): Promise<Result> {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file first." };
  if (!["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(file.type)) return { error: "Please upload a PDF or an image." };
  try {
    const uploaded = await uploadedFilesService.uploadFile({ file, purpose: "PAST_PAPER", uploadedById: session.user.id });
    await db.pastPaper.update({ where: { id: paperId }, data: { fileId: uploaded.id } });
    await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "PastPaper", entityId: paperId, after: { fileId: uploaded.id } });
    refresh();
    return {};
  } catch (err) {
    if (err instanceof uploadedFilesService.FileValidationError) return { error: err.message };
    return fail(err, "Couldn't upload the file.");
  }
}
