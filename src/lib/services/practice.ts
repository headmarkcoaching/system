import "server-only";
import { Prisma } from "@prisma/client";
import type { PracticeMode, PracticeScope } from "@prisma/client";
import { db } from "@/lib/db";
import * as doubtService from "@/lib/services/doubts";
import {
  SCOPE_DEFAULT_COUNT,
  answersMatch,
  buildScopeBlocks,
  isObjectiveType,
  masteryLevel,
  recommendNext,
  seededShuffle,
  selectQuestions,
  suggestedDuration,
  type ChapterLite,
  type ChapterMastery,
  type MasteryLevel,
} from "@/lib/practice";

export const MAX_PAPER_QUESTIONS = 60;
/** A quarter, half or full-book paper counts as passed at this share of the marks. */
export const PASS_PERCENT = 70;
const MASTERY_WINDOW = 20;

export interface AnswerRecord {
  answer: string;
  marksAwarded: number | null;
  selfMarked?: boolean;
}
export type AnswerMap = Record<string, AnswerRecord>;

// ---- What a student can practise ----

async function getStudentScope(studentId: string) {
  const student = await db.student.findUnique({ where: { id: studentId }, select: { academicLevelId: true, boardId: true } });
  if (!student) throw new Error("Your student profile was not found.");
  return student;
}

/** Visible to a student: their own class, and either board-neutral or their own board. */
function visibleTo(student: { academicLevelId: string; boardId: string | null }) {
  return {
    academicLevelId: student.academicLevelId,
    OR: student.boardId ? [{ boardId: null }, { boardId: student.boardId }] : [{ boardId: null }],
  };
}

export async function listPracticeSubjects(studentId: string) {
  const student = await getStudentScope(studentId);
  const subjects = await doubtService.listAskableSubjects(studentId);
  const withChapters = await db.chapter.groupBy({
    by: ["subjectId"],
    where: { subjectId: { in: subjects.map((s) => s.subjectId) }, isActive: true, ...visibleTo(student) },
    _count: { _all: true },
  });
  const hasContent = new Set(withChapters.map((g) => g.subjectId));
  return subjects.map((s) => ({ subjectId: s.subjectId, subjectName: s.subjectName, hasContent: hasContent.has(s.subjectId) }));
}

/** The ordered chapters of this subject's book for the student. A board-specific chapter wins
 * over a board-neutral one with the same number. */
export async function getBook(studentId: string, subjectId: string): Promise<ChapterLite[]> {
  const student = await getStudentScope(studentId);
  const rows = await db.chapter.findMany({ where: { subjectId, isActive: true, ...visibleTo(student) }, orderBy: [{ number: "asc" }] });
  const byNumber = new Map<number, (typeof rows)[number]>();
  for (const row of rows) {
    const existing = byNumber.get(row.number);
    if (!existing || (row.boardId && !existing.boardId)) byNumber.set(row.number, row);
  }
  return Array.from(byNumber.values())
    .sort((a, b) => a.number - b.number)
    .map((c) => ({ id: c.id, number: c.number, title: c.title }));
}

async function availableCounts(studentId: string, chapterIds: string[]) {
  const student = await getStudentScope(studentId);
  const grouped = await db.bankQuestion.groupBy({
    by: ["chapterId"],
    where: { chapterId: { in: chapterIds }, status: "APPROVED", ...visibleTo(student) },
    _count: { _all: true },
  });
  return new Map(grouped.map((g) => [g.chapterId, g._count._all]));
}

// ---- Mastery ----

export interface MasteryRow extends ChapterMastery {
  level: MasteryLevel;
  lastPracticedAt: Date | null;
}

export async function getMastery(studentId: string, subjectId: string): Promise<Map<string, MasteryRow>> {
  const sessions = await db.practiceSession.findMany({
    where: { studentId, subjectId, status: "SUBMITTED" },
    select: { questionIds: true, answers: true, submittedAt: true },
    orderBy: { submittedAt: "asc" },
  });
  const ids = Array.from(new Set(sessions.flatMap((s) => s.questionIds)));
  const questions = ids.length ? await db.bankQuestion.findMany({ where: { id: { in: ids } }, select: { id: true, chapterId: true, marks: true } }) : [];
  const info = new Map(questions.map((q) => [q.id, q]));

  const entries = new Map<string, { earned: number; possible: number; at: Date }[]>();
  for (const s of sessions) {
    const answers = (s.answers ?? {}) as unknown as AnswerMap;
    for (const qid of s.questionIds) {
      const q = info.get(qid);
      const record = answers[qid];
      // Written answers that nobody has marked yet say nothing about mastery, so they are left out.
      if (!q || !record || record.marksAwarded === null || q.marks <= 0) continue;
      const list = entries.get(q.chapterId) ?? [];
      list.push({ earned: Math.min(q.marks, record.marksAwarded), possible: q.marks, at: s.submittedAt ?? new Date(0) });
      entries.set(q.chapterId, list);
    }
  }

  const result = new Map<string, MasteryRow>();
  for (const [chapterId, list] of entries) {
    const recent = list.slice(-MASTERY_WINDOW);
    // Weighted by marks, so it agrees with the marks shown on a paper's review screen.
    const percent = Math.round((recent.reduce((sum, e) => sum + e.earned, 0) / recent.reduce((sum, e) => sum + e.possible, 0)) * 100);
    const base = { chapterId, attempted: list.length, percent };
    result.set(chapterId, { ...base, level: masteryLevel(base), lastPracticedAt: list[list.length - 1].at });
  }
  return result;
}

const sortedSignature = (ids: string[]) => [...ids].sort().join(",");

async function getPassedScopeKeys(studentId: string, subjectId: string, blocks: ReturnType<typeof buildScopeBlocks>) {
  const sessions = await db.practiceSession.findMany({
    where: { studentId, subjectId, status: "SUBMITTED", scope: { in: ["QUARTER", "HALF", "FULL"] } },
    select: { chapterIds: true, marksObtained: true, totalMarks: true },
  });
  const passedSignatures = new Set(
    sessions.filter((s) => s.totalMarks > 0 && ((s.marksObtained ?? 0) / s.totalMarks) * 100 >= PASS_PERCENT).map((s) => sortedSignature(s.chapterIds))
  );
  const keys = new Set<string>();
  for (const block of [...blocks.quarters, ...blocks.halves, ...(blocks.full ? [blocks.full] : [])]) {
    if (passedSignatures.has(sortedSignature(block.chapterIds))) keys.add(block.key);
  }
  return keys;
}

// ---- The practice hub ----

export async function getHubData(studentId: string, subjectId: string) {
  const student = await getStudentScope(studentId);
  const chapters = await getBook(studentId, subjectId);
  const blocks = buildScopeBlocks(chapters);
  const [available, mastery, passedScopeKeys, recent, papers] = await Promise.all([
    availableCounts(studentId, chapters.map((c) => c.id)),
    getMastery(studentId, subjectId),
    getPassedScopeKeys(studentId, subjectId, blocks),
    listSessions(studentId, subjectId, 6),
    db.pastPaper.count({ where: { subjectId, isPublished: true, ...visibleTo(student) } }),
  ]);
  const recommendations = recommendNext({ chapters: blocks.chapters, blocks, mastery, passedScopeKeys, availableByChapter: available });
  const questionsAvailableIn = (ids: string[]) => ids.reduce((sum, id) => sum + (available.get(id) ?? 0), 0);
  return { chapters: blocks.chapters, blocks, available, mastery, passedScopeKeys, recommendations, recent, pastPaperCount: papers, questionsAvailableIn };
}

export function listSessions(studentId: string, subjectId?: string, take = 10) {
  return db.practiceSession.findMany({
    where: { studentId, ...(subjectId ? { subjectId } : {}) },
    include: { subject: { select: { name: true } } },
    orderBy: { startedAt: "desc" },
    take,
  });
}

export interface PracticeScoreRow {
  id: string;
  subjectName: string;
  scopeLabel: string;
  submittedAt: Date;
  marksObtained: number;
  totalMarks: number;
  percent: number;
  /** Written answers the student has not marked yet, so the score may still rise. */
  markingPending: boolean;
}

/** Scores only, for the parent and teacher views: no questions, answers or explanations.
 * Callers must already have checked that the viewer may see this student. */
export async function getPracticeScoresForStudent(studentId: string, take = 10) {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const sessions = await db.practiceSession.findMany({
    where: { studentId, status: "SUBMITTED", submittedAt: { not: null } },
    select: {
      id: true,
      scopeLabel: true,
      totalMarks: true,
      marksObtained: true,
      submittedAt: true,
      answers: true,
      subject: { select: { name: true } },
    },
    orderBy: { submittedAt: "desc" },
    take: Math.max(take, 50),
  });

  const rows: PracticeScoreRow[] = sessions
    .filter((s) => s.totalMarks > 0 && s.submittedAt)
    .map((s) => {
      const answers = Object.values((s.answers ?? {}) as unknown as AnswerMap);
      const marksObtained = s.marksObtained ?? 0;
      return {
        id: s.id,
        subjectName: s.subject.name,
        scopeLabel: s.scopeLabel,
        submittedAt: s.submittedAt!,
        marksObtained,
        totalMarks: s.totalMarks,
        percent: Math.round((marksObtained / s.totalMarks) * 100),
        markingPending: answers.some((a) => a.marksAwarded === null),
      };
    });

  const thisWeek = rows.filter((r) => r.submittedAt >= weekAgo);
  return {
    recent: rows.slice(0, take),
    weekCount: thisWeek.length,
    // Papers still waiting on written-answer marking would drag the average down unfairly.
    weekAveragePercent: (() => {
      const settled = thisWeek.filter((r) => !r.markingPending);
      return settled.length ? Math.round(settled.reduce((sum, r) => sum + r.percent, 0) / settled.length) : null;
    })(),
  };
}

export async function listPastPapersForStudent(studentId: string, subjectId: string) {
  const student = await getStudentScope(studentId);
  const papers = await db.pastPaper.findMany({
    where: { subjectId, isPublished: true, ...visibleTo(student) },
    include: { board: true, file: { select: { id: true, filename: true } }, _count: { select: { questions: { where: { status: "APPROVED" } } } } },
    orderBy: [{ year: "desc" }, { title: "asc" }],
  });
  const attempts = await db.practiceSession.findMany({
    where: { studentId, scope: "PAST_PAPER", pastPaperId: { in: papers.map((p) => p.id) }, status: "SUBMITTED" },
    select: { pastPaperId: true, marksObtained: true, totalMarks: true },
  });
  return papers.map((p) => {
    const mine = attempts.filter((a) => a.pastPaperId === p.id);
    const best = mine.reduce((m, a) => Math.max(m, a.totalMarks ? Math.round(((a.marksObtained ?? 0) / a.totalMarks) * 100) : 0), -1);
    return { ...p, attempts: mine.length, bestPercent: best >= 0 ? best : null };
  });
}

// ---- Starting a paper ----

export interface StartInput {
  subjectId: string;
  scope: PracticeScope;
  mode: PracticeMode;
  chapterId?: string;
  blockKey?: string;
  pastPaperId?: string;
  count?: number;
  difficulty?: "MIXED" | "EASY" | "MEDIUM" | "HARD";
  objectiveOnly?: boolean;
}

export async function startSession(studentId: string, input: StartInput) {
  const student = await getStudentScope(studentId);
  const allowed = (await listPracticeSubjects(studentId)).some((s) => s.subjectId === input.subjectId);
  if (!allowed) throw new Error("That subject is not part of your batch.");

  const chapters = await getBook(studentId, input.subjectId);
  const blocks = buildScopeBlocks(chapters);
  const questionVisibility = { subjectId: input.subjectId, status: "APPROVED" as const, ...visibleTo(student) };

  // A past paper is a fixed set of questions in the paper's own order, always timed.
  if (input.scope === "PAST_PAPER") {
    if (!input.pastPaperId) throw new Error("Choose a past paper.");
    const paper = await db.pastPaper.findFirst({ where: { id: input.pastPaperId, subjectId: input.subjectId, isPublished: true, ...visibleTo(student) } });
    if (!paper) throw new Error("That past paper isn't available.");
    const questions = await db.bankQuestion.findMany({ where: { ...questionVisibility, pastPaperId: paper.id }, orderBy: [{ paperOrder: "asc" }, { createdAt: "asc" }], select: { id: true, marks: true, chapterId: true } });
    if (questions.length === 0) throw new Error("This paper has no questions to attempt online yet. You can open the paper itself instead.");
    const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
    return db.practiceSession.create({
      data: {
        studentId,
        subjectId: input.subjectId,
        mode: "EXAM",
        scope: "PAST_PAPER",
        scopeLabel: `${paper.title} (${paper.year})`,
        chapterIds: Array.from(new Set(questions.map((q) => q.chapterId))),
        pastPaperId: paper.id,
        questionIds: questions.map((q) => q.id),
        totalMarks,
        durationMinutes: paper.durationMinutes,
      },
    });
  }

  let scopeChapters: ChapterLite[] = [];
  let label = "";
  if (input.scope === "CHAPTER") {
    const chapter = chapters.find((c) => c.id === input.chapterId);
    if (!chapter) throw new Error("Choose a chapter from your book.");
    scopeChapters = [chapter];
    label = `Chapter ${chapter.number}: ${chapter.title}`;
  } else if (input.scope === "WEAK_AREAS") {
    const [mastery, available] = await Promise.all([getMastery(studentId, input.subjectId), availableCounts(studentId, chapters.map((c) => c.id))]);
    const weakest = chapters
      .filter((c) => (available.get(c.id) ?? 0) > 0)
      .map((c) => ({ c, m: mastery.get(c.id) }))
      .filter((x) => x.m && x.m.percent !== null && x.m.percent < 75)
      .sort((a, b) => (a.m!.percent as number) - (b.m!.percent as number))
      .slice(0, 3)
      .map((x) => x.c)
      .sort((a, b) => a.number - b.number);
    if (weakest.length === 0) throw new Error("No weak chapters yet. Practise a chapter or two first and we'll find where you need work.");
    scopeChapters = weakest;
    label = `Weak areas: ${weakest.map((c) => `Chapter ${c.number}`).join(", ")}`;
  } else {
    const block = [...blocks.quarters, ...blocks.halves, ...(blocks.full ? [blocks.full] : [])].find((b) => b.key === input.blockKey && b.scope === input.scope);
    if (!block) throw new Error("Choose a part of the book.");
    scopeChapters = chapters.filter((c) => block.chapterIds.includes(c.id));
    label = `${block.label} (${block.detail})`;
  }

  const requested = Math.min(MAX_PAPER_QUESTIONS, Math.max(1, Math.round(input.count ?? SCOPE_DEFAULT_COUNT[input.scope as keyof typeof SCOPE_DEFAULT_COUNT])));
  const pool = await db.bankQuestion.findMany({
    where: { ...questionVisibility, chapterId: { in: scopeChapters.map((c) => c.id) } },
    select: { id: true, chapterId: true, type: true, marks: true, difficulty: true },
  });
  if (pool.length === 0) throw new Error("There are no approved questions for this part of the book yet. Ask your teacher to add some.");

  const previous = await db.practiceSession.findMany({ where: { studentId, subjectId: input.subjectId }, select: { questionIds: true } });
  const seenCounts = new Map<string, number>();
  for (const s of previous) for (const id of s.questionIds) seenCounts.set(id, (seenCounts.get(id) ?? 0) + 1);

  const chosen = selectQuestions(pool, {
    count: requested,
    chapterOrder: scopeChapters.map((c) => c.id),
    seenCounts,
    difficulty: input.difficulty ?? "MIXED",
    objectiveOnly: !!input.objectiveOnly,
    seed: `${studentId}:${Date.now()}`,
  });
  if (chosen.length === 0) throw new Error("No questions match those settings. Try a different difficulty or include written questions.");

  const totalMarks = chosen.reduce((s, q) => s + q.marks, 0);
  return db.practiceSession.create({
    data: {
      studentId,
      subjectId: input.subjectId,
      mode: input.mode,
      scope: input.scope,
      scopeLabel: label,
      chapterIds: scopeChapters.map((c) => c.id),
      questionIds: chosen.map((q) => q.id),
      totalMarks,
      durationMinutes: input.mode === "EXAM" ? suggestedDuration(totalMarks) : null,
    },
  });
}

/** What the start page shows before a paper is built: how many questions exist for the choice. */
export async function previewScope(studentId: string, subjectId: string, scope: PracticeScope, target?: string) {
  const chapters = await getBook(studentId, subjectId);
  const blocks = buildScopeBlocks(chapters);
  const available = await availableCounts(studentId, chapters.map((c) => c.id));
  const total = (ids: string[]) => ids.reduce((s, id) => s + (available.get(id) ?? 0), 0);

  if (scope === "CHAPTER") {
    const c = chapters.find((x) => x.id === target);
    return c ? { label: `Chapter ${c.number}: ${c.title}`, detail: "One chapter", available: total([c.id]), chapterCount: 1 } : null;
  }
  if (scope === "WEAK_AREAS") {
    const mastery = await getMastery(studentId, subjectId);
    const weak = chapters.filter((c) => (mastery.get(c.id)?.percent ?? 100) < 75 && mastery.has(c.id) && (available.get(c.id) ?? 0) > 0).slice(0, 3);
    return weak.length ? { label: "Your weak areas", detail: weak.map((c) => `Chapter ${c.number}`).join(", "), available: total(weak.map((c) => c.id)), chapterCount: weak.length } : null;
  }
  const block = [...blocks.quarters, ...blocks.halves, ...(blocks.full ? [blocks.full] : [])].find((b) => b.key === target && b.scope === scope);
  return block ? { label: `${block.label}`, detail: block.detail, available: total(block.chapterIds), chapterCount: block.chapterIds.length } : null;
}

// ---- Running and reviewing a session ----

export async function getSessionView(id: string, studentId: string) {
  const session = await db.practiceSession.findUnique({ where: { id }, include: { subject: { select: { name: true } } } });
  if (!session || session.studentId !== studentId) return null;

  const rows = await db.bankQuestion.findMany({ where: { id: { in: session.questionIds } }, include: { chapter: { select: { number: true, title: true } } } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const questions = session.questionIds
    .map((qid) => byId.get(qid))
    .filter((q): q is NonNullable<typeof q> => !!q)
    .map((q) => ({
      id: q.id,
      chapterId: q.chapterId,
      chapterNumber: q.chapter.number,
      chapterTitle: q.chapter.title,
      type: q.type,
      questionText: q.questionText,
      // The order of choices is fixed per session so a reload never reshuffles an answer under the student.
      options: Array.isArray(q.options) ? seededShuffle(q.options as string[], `${session.id}:${q.id}`) : null,
      marks: q.marks,
      difficulty: q.difficulty,
      topic: q.topic,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    }));
  return { session, questions, answers: (session.answers ?? {}) as unknown as AnswerMap };
}

export async function submitSession(id: string, studentId: string, rawAnswers: Record<string, string>) {
  const view = await getSessionView(id, studentId);
  if (!view) throw new Error("Practice session not found.");
  if (view.session.status === "SUBMITTED") return { marksObtained: view.session.marksObtained ?? 0, totalMarks: view.session.totalMarks, needsSelfMarking: false };

  const answers: AnswerMap = {};
  let objectiveTotal = 0;
  let needsSelfMarking = false;
  for (const q of view.questions) {
    const given = String(rawAnswers[q.id] ?? "").trim().slice(0, 4000);
    if (isObjectiveType(q.type)) {
      const marksAwarded = answersMatch(q.type, given, q.correctAnswer) ? q.marks : 0;
      answers[q.id] = { answer: given, marksAwarded };
      objectiveTotal += marksAwarded;
    } else {
      answers[q.id] = { answer: given, marksAwarded: null };
      needsSelfMarking = true;
    }
  }

  await db.practiceSession.update({
    where: { id },
    data: { answers: answers as unknown as Prisma.InputJsonValue, status: "SUBMITTED", submittedAt: new Date(), marksObtained: objectiveTotal },
  });
  return { marksObtained: objectiveTotal, totalMarks: view.session.totalMarks, needsSelfMarking };
}

/** Written answers are marked by the student against the model answer, each between zero and the
 * question's marks. The score is recalculated from every marked answer. */
export async function selfMark(id: string, studentId: string, marks: Record<string, number>) {
  const view = await getSessionView(id, studentId);
  if (!view || view.session.status !== "SUBMITTED") throw new Error("Finish the paper before marking it.");
  const answers = { ...view.answers };
  for (const q of view.questions) {
    if (isObjectiveType(q.type) || marks[q.id] === undefined) continue;
    const value = Math.round(Number(marks[q.id]));
    if (!Number.isFinite(value) || value < 0 || value > q.marks) throw new Error(`Marks for a question must be between 0 and ${q.marks}.`);
    answers[q.id] = { ...(answers[q.id] ?? { answer: "" }), marksAwarded: value, selfMarked: true };
  }
  const total = Object.values(answers).reduce((s, a) => s + (a.marksAwarded ?? 0), 0);
  await db.practiceSession.update({ where: { id }, data: { answers: answers as unknown as Prisma.InputJsonValue, marksObtained: total } });
  return { marksObtained: total, totalMarks: view.session.totalMarks };
}

export async function getSessionBreakdown(view: NonNullable<Awaited<ReturnType<typeof getSessionView>>>) {
  const byChapter = new Map<string, { chapterNumber: number; chapterTitle: string; earned: number; possible: number; pending: number }>();
  for (const q of view.questions) {
    const entry = byChapter.get(q.chapterId) ?? { chapterNumber: q.chapterNumber, chapterTitle: q.chapterTitle, earned: 0, possible: 0, pending: 0 };
    const awarded = view.answers[q.id]?.marksAwarded;
    if (awarded === null || awarded === undefined) entry.pending += 1;
    else {
      entry.earned += awarded;
      entry.possible += q.marks;
    }
    byChapter.set(q.chapterId, entry);
  }
  return Array.from(byChapter.values()).sort((a, b) => a.chapterNumber - b.chapterNumber);
}
