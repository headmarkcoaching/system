import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type { BankQuestionSource, BankQuestionStatus, PastPaperSession, QuestionDifficulty, QuestionType } from "@prisma/client";
export { parseImportText, type ImportedQuestion } from "@/lib/question-import";

const PAGE_SIZE = 20;

// ---- Chapters ----

export function listChapters(filters: { subjectId?: string; academicLevelId?: string } = {}) {
  return db.chapter.findMany({
    where: { ...(filters.subjectId ? { subjectId: filters.subjectId } : {}), ...(filters.academicLevelId ? { academicLevelId: filters.academicLevelId } : {}) },
    include: { subject: true, academicLevel: true, board: true, _count: { select: { questions: { where: { status: "APPROVED" } } } } },
    orderBy: [{ academicLevel: { sortOrder: "asc" } }, { subject: { name: "asc" } }, { number: "asc" }],
  });
}

export interface ChapterInput {
  subjectId: string;
  academicLevelId: string;
  boardId?: string;
  number: number;
  title: string;
}

/** A book has one chapter per number, per board. The database cannot enforce that when the board
 * is blank (blank values never collide), so it is checked here. */
async function assertChapterNumberFree(input: ChapterInput, ignoreId?: string) {
  const clash = await db.chapter.findFirst({
    where: { subjectId: input.subjectId, academicLevelId: input.academicLevelId, boardId: input.boardId ?? null, number: input.number, ...(ignoreId ? { id: { not: ignoreId } } : {}) },
    select: { id: true },
  });
  if (clash) throw new Error(`Chapter ${input.number} already exists for this subject and class.`);
}

export async function createChapter(input: ChapterInput) {
  await assertChapterNumberFree(input);
  return db.chapter.create({ data: { ...input, boardId: input.boardId ?? null } });
}

export async function updateChapter(id: string, input: ChapterInput) {
  await assertChapterNumberFree(input, id);
  return db.chapter.update({ where: { id }, data: { number: input.number, title: input.title, boardId: input.boardId ?? null } });
}

export async function deleteChapter(id: string) {
  const count = await db.bankQuestion.count({ where: { chapterId: id } });
  if (count > 0) throw new Error(`This chapter still has ${count} question${count === 1 ? "" : "s"}. Move or delete them first.`);
  return db.chapter.delete({ where: { id } });
}

// ---- Questions ----

export interface QuestionFilters {
  subjectId?: string;
  academicLevelId?: string;
  chapterId?: string;
  status?: BankQuestionStatus;
  source?: BankQuestionSource;
  pastPaperId?: string;
  q?: string;
  page?: number;
}

function buildQuestionWhere(f: QuestionFilters): Prisma.BankQuestionWhereInput {
  return {
    ...(f.subjectId ? { subjectId: f.subjectId } : {}),
    ...(f.academicLevelId ? { academicLevelId: f.academicLevelId } : {}),
    ...(f.chapterId ? { chapterId: f.chapterId } : {}),
    ...(f.status ? { status: f.status } : {}),
    ...(f.source ? { source: f.source } : {}),
    ...(f.pastPaperId ? { pastPaperId: f.pastPaperId } : {}),
    ...(f.q ? { questionText: { contains: f.q, mode: "insensitive" as const } } : {}),
  };
}

export async function listQuestions(filters: QuestionFilters = {}) {
  const page = Math.max(1, filters.page ?? 1);
  const where = buildQuestionWhere(filters);
  const [rows, total] = await Promise.all([
    db.bankQuestion.findMany({
      where,
      include: { subject: { select: { name: true } }, chapter: { select: { number: true, title: true } }, academicLevel: { select: { name: true } }, pastPaper: { select: { title: true } } },
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.bankQuestion.count({ where }),
  ]);
  return { rows, total, page, pageSize: PAGE_SIZE, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getQuestionCounts() {
  const grouped = await db.bankQuestion.groupBy({ by: ["status"], _count: { _all: true } });
  const out = { DRAFT: 0, APPROVED: 0, ARCHIVED: 0 };
  for (const g of grouped) out[g.status] = g._count._all;
  return out;
}

export interface QuestionInput {
  subjectId: string;
  chapterId: string;
  topic?: string;
  type: QuestionType;
  questionText: string;
  options?: string[];
  correctAnswer?: string;
  explanation?: string;
  marks: number;
  difficulty: QuestionDifficulty;
  source?: BankQuestionSource;
  status?: BankQuestionStatus;
  pastPaperId?: string;
  paperOrder?: number;
  createdById?: string;
}

/** The subject, class and board of a question always come from its chapter, so a question can
 * never be filed under one chapter and counted for another class. */
export async function validateQuestion(input: QuestionInput) {
  const chapter = await db.chapter.findUnique({ where: { id: input.chapterId } });
  if (!chapter || chapter.subjectId !== input.subjectId) throw new Error("That chapter doesn't belong to the chosen subject.");

  const options = (input.options ?? []).map((o) => o.trim()).filter(Boolean);
  if (input.type === "MCQ") {
    if (options.length < 2) throw new Error("A multiple-choice question needs at least two options.");
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) throw new Error("Options must all be different.");
    if (!input.correctAnswer || !options.some((o) => o === input.correctAnswer!.trim())) throw new Error("The correct answer must match one of the options exactly.");
  }
  if (input.type === "NUMERICAL" && !input.correctAnswer?.trim()) throw new Error("A numerical question needs its correct answer.");
  if (input.marks < 1 || input.marks > 50) throw new Error("Marks must be between 1 and 50.");

  if (input.pastPaperId) {
    const paper = await db.pastPaper.findUnique({ where: { id: input.pastPaperId }, select: { subjectId: true, academicLevelId: true } });
    if (!paper || paper.subjectId !== input.subjectId || paper.academicLevelId !== chapter.academicLevelId) throw new Error("That past paper is for a different subject or class.");
  }
  return { chapter, options };
}

export async function createQuestion(input: QuestionInput) {
  const { chapter, options } = await validateQuestion(input);
  return db.bankQuestion.create({
    data: {
      subjectId: input.subjectId,
      academicLevelId: chapter.academicLevelId,
      boardId: chapter.boardId,
      chapterId: chapter.id,
      topic: input.topic || null,
      type: input.type,
      questionText: input.questionText.trim(),
      options: input.type === "MCQ" ? options : undefined,
      correctAnswer: input.correctAnswer?.trim() || null,
      explanation: input.explanation?.trim() || null,
      marks: input.marks,
      difficulty: input.difficulty,
      source: input.pastPaperId ? "PAST_PAPER" : (input.source ?? "TEACHER"),
      status: input.status ?? "DRAFT",
      pastPaperId: input.pastPaperId || null,
      paperOrder: input.paperOrder ?? 0,
      createdById: input.createdById,
    },
  });
}

export async function updateQuestion(id: string, input: QuestionInput) {
  const { chapter, options } = await validateQuestion(input);
  return db.bankQuestion.update({
    where: { id },
    data: {
      subjectId: input.subjectId,
      academicLevelId: chapter.academicLevelId,
      boardId: chapter.boardId,
      chapterId: chapter.id,
      topic: input.topic || null,
      type: input.type,
      questionText: input.questionText.trim(),
      // DbNull clears the column; plain undefined would leave a stale option list behind.
      options: input.type === "MCQ" ? options : Prisma.DbNull,
      correctAnswer: input.correctAnswer?.trim() || null,
      explanation: input.explanation?.trim() || null,
      marks: input.marks,
      difficulty: input.difficulty,
      pastPaperId: input.pastPaperId || null,
      paperOrder: input.paperOrder ?? 0,
      ...(input.status ? { status: input.status } : {}),
    },
  });
}

export function setQuestionStatus(id: string, status: BankQuestionStatus) {
  return db.bankQuestion.update({ where: { id }, data: { status } });
}

/** Practice sessions refer to questions by id, so anything that has been approved is archived
 * rather than deleted; only drafts can be removed outright. */
export async function deleteQuestion(id: string) {
  const q = await db.bankQuestion.findUnique({ where: { id }, select: { status: true } });
  if (!q) return;
  if (q.status !== "DRAFT") throw new Error("Only drafts can be deleted. Archive an approved question instead.");
  return db.bankQuestion.delete({ where: { id } });
}

export function getQuestion(id: string) {
  return db.bankQuestion.findUnique({ where: { id } });
}

// ---- Past papers ----

export interface PastPaperInput {
  subjectId: string;
  academicLevelId: string;
  boardId?: string;
  year: number;
  session: PastPaperSession;
  title: string;
  totalMarks: number;
  durationMinutes: number;
  fileId?: string;
  createdById?: string;
}

export function listPastPapers(filters: { subjectId?: string; academicLevelId?: string; publishedOnly?: boolean } = {}) {
  return db.pastPaper.findMany({
    where: {
      ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
      ...(filters.academicLevelId ? { academicLevelId: filters.academicLevelId } : {}),
      ...(filters.publishedOnly ? { isPublished: true } : {}),
    },
    include: {
      subject: true,
      academicLevel: true,
      board: true,
      file: { select: { id: true, filename: true } },
      _count: { select: { questions: { where: { status: "APPROVED" } } } },
    },
    orderBy: [{ year: "desc" }, { title: "asc" }],
  });
}

export function createPastPaper(input: PastPaperInput) {
  return db.pastPaper.create({ data: { ...input, boardId: input.boardId ?? null } });
}

export function updatePastPaper(id: string, input: Omit<PastPaperInput, "createdById" | "fileId">) {
  return db.pastPaper.update({ where: { id }, data: { ...input, boardId: input.boardId ?? null } });
}

export function setPastPaperPublished(id: string, isPublished: boolean) {
  return db.pastPaper.update({ where: { id }, data: { isPublished } });
}

export async function deletePastPaper(id: string) {
  const sessions = await db.practiceSession.count({ where: { pastPaperId: id } });
  if (sessions > 0) throw new Error("Students have already attempted this paper, so it can't be deleted. Unpublish it instead.");
  return db.pastPaper.delete({ where: { id } });
}
