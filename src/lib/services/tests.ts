import "server-only";
import { db } from "@/lib/db";
import type { QuestionType, TestStatus, Prisma } from "@prisma/client";
import { checkLowTestScore } from "@/lib/automation/test-score";
import { onTestGraded } from "@/lib/services/gamification";

export interface AnswerRecord {
  answer: string;
  marksAwarded: number | null;
}

// ---- Test CRUD ----

export interface CreateTestInput {
  name: string;
  academicLevelId: string;
  subjectId: string;
  chapter?: string;
  batchId: string;
  totalMarks: number;
  passingMarks: number;
  durationMinutes: number;
  startDate: string;
  endDate: string;
  createdById: string;
}

export function createTest(input: CreateTestInput) {
  return db.test.create({
    data: { ...input, startDate: new Date(input.startDate), endDate: new Date(input.endDate) },
  });
}

export function updateTest(id: string, data: Partial<Omit<CreateTestInput, "createdById">>) {
  return db.test.update({
    where: { id },
    data: {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
}

export function updateTestStatus(id: string, status: TestStatus) {
  return db.test.update({ where: { id }, data: { status } });
}

export function listTestsForBatch(batchId: string) {
  return db.test.findMany({
    where: { batchId },
    include: { subject: true, questions: true, results: true },
    orderBy: { startDate: "desc" },
  });
}

export async function listTestsForTeacher(teacherId: string) {
  const batchIds = (await db.batchTeacher.findMany({ where: { teacherId }, select: { batchId: true }, distinct: ["batchId"] })).map((b) => b.batchId);
  return db.test.findMany({
    where: { batchId: { in: batchIds } },
    include: { subject: true, batch: true, results: true },
    orderBy: { startDate: "desc" },
  });
}

export async function listTestsForStudent(studentId: string) {
  const batchIds = (await db.batchStudent.findMany({ where: { studentId }, select: { batchId: true } })).map((b) => b.batchId);
  const tests = await db.test.findMany({
    where: { batchId: { in: batchIds }, status: { in: ["ACTIVE", "SCHEDULED", "COMPLETED"] } },
    include: { subject: true, batch: true, questions: { select: { id: true, marks: true } } },
    orderBy: { startDate: "desc" },
  });

  const [attempts, results] = await Promise.all([
    db.testAttempt.findMany({ where: { studentId, testId: { in: tests.map((t) => t.id) } } }),
    db.testResult.findMany({ where: { studentId, testId: { in: tests.map((t) => t.id) } } }),
  ]);
  const attemptByTest = new Map(attempts.map((a) => [a.testId, a]));
  const resultByTest = new Map(results.map((r) => [r.testId, r]));

  return tests.map((test) => ({
    ...test,
    attempt: attemptByTest.get(test.id) ?? null,
    result: resultByTest.get(test.id) ?? null,
  }));
}

export function getTestById(id: string) {
  return db.test.findUnique({
    where: { id },
    include: {
      academicLevel: true,
      subject: true,
      batch: true,
      questions: { orderBy: { order: "asc" } },
    },
  });
}

// ---- Questions ----

export interface CreateQuestionInput {
  testId: string;
  type: QuestionType;
  questionText: string;
  options?: string[];
  correctAnswer?: string;
  marks: number;
  topic?: string;
  order: number;
}

export function addQuestion(input: CreateQuestionInput) {
  return db.testQuestion.create({
    data: {
      testId: input.testId,
      type: input.type,
      questionText: input.questionText,
      options: input.options ?? undefined,
      correctAnswer: input.correctAnswer,
      marks: input.marks,
      topic: input.topic,
      order: input.order,
    },
  });
}

export function updateQuestion(id: string, data: Partial<Omit<CreateQuestionInput, "testId" | "order">>) {
  return db.testQuestion.update({
    where: { id },
    data: { ...data, options: data.options ?? undefined },
  });
}

export function deleteQuestion(id: string) {
  return db.testQuestion.delete({ where: { id } });
}

// ---- Taking a test ----

export async function getTestForTaking(testId: string, studentId: string) {
  const test = await db.test.findUniqueOrThrow({
    where: { id: testId },
    include: { subject: true, batch: true, questions: { orderBy: { order: "asc" } } },
  });
  const attempt = await db.testAttempt.findUnique({ where: { testId_studentId: { testId, studentId } } });
  const result = await db.testResult.findUnique({ where: { testId_studentId: { testId, studentId } } });
  return { test, attempt, result };
}

export async function startTestAttempt(testId: string, studentId: string) {
  const existing = await db.testAttempt.findUnique({ where: { testId_studentId: { testId, studentId } } });
  if (existing) return existing;
  return db.testAttempt.create({ data: { testId, studentId } });
}

/** studentId is required and checked against the attempt's own studentId before any write —
 * found during the Phase 3E security review that the caller previously trusted attemptId
 * alone, which would let any student submit/overwrite another student's test attempt (and
 * therefore their score) by guessing or knowing the ID. Same fix shape as
 * batches.ts's studentSubmitHomework. */
export async function submitTestAttempt(attemptId: string, studentId: string, rawAnswers: Record<string, string>) {
  const attempt = await db.testAttempt.findUniqueOrThrow({
    where: { id: attemptId },
    include: { test: { include: { questions: true } } },
  });
  if (attempt.studentId !== studentId) {
    throw new Error("Attempt not found.");
  }

  const answers: Record<string, AnswerRecord> = {};
  let autoTotal = 0;
  let allAutoGraded = true;

  for (const q of attempt.test.questions) {
    const studentAnswer = (rawAnswers[q.id] ?? "").trim();
    if (q.type === "MCQ" || q.type === "NUMERICAL") {
      const isCorrect = studentAnswer.toLowerCase() === (q.correctAnswer ?? "").trim().toLowerCase();
      const marksAwarded = isCorrect ? q.marks : 0;
      answers[q.id] = { answer: studentAnswer, marksAwarded };
      autoTotal += marksAwarded;
    } else {
      answers[q.id] = { answer: studentAnswer, marksAwarded: null };
      allAutoGraded = false;
    }
  }

  await db.testAttempt.update({ where: { id: attemptId }, data: { answers: answers as unknown as Prisma.InputJsonValue, submittedAt: new Date() } });

  await db.testResult.upsert({
    where: { testId_studentId: { testId: attempt.testId, studentId: attempt.studentId } },
    create: {
      testId: attempt.testId,
      studentId: attempt.studentId,
      attemptId,
      marksObtained: autoTotal,
      totalMarks: attempt.test.totalMarks,
      gradedAt: allAutoGraded ? new Date() : null,
    },
    update: {
      marksObtained: autoTotal,
      gradedAt: allAutoGraded ? new Date() : null,
    },
  });

  if (allAutoGraded) {
    try {
      await checkLowTestScore(attempt.testId, attempt.studentId, autoTotal, attempt.test.totalMarks);
    } catch (err) {
      console.error("checkLowTestScore failed", err);
    }
    try {
      await onTestGraded(attempt.studentId, attempt.testId, autoTotal, attempt.test.totalMarks);
    } catch (err) {
      console.error("onTestGraded failed", err);
    }
  }

  return { allAutoGraded };
}

// ---- Grading ----

export function listAttemptsForTest(testId: string) {
  return db.testAttempt.findMany({
    where: { testId, submittedAt: { not: null } },
    include: { student: true, result: true },
    orderBy: { student: { fullName: "asc" } },
  });
}

export async function gradeSubjectiveAnswers(attemptId: string, gradedById: string, grades: { questionId: string; marksAwarded: number }[]) {
  const attempt = await db.testAttempt.findUniqueOrThrow({ where: { id: attemptId } });
  const answers = (attempt.answers as unknown as Record<string, AnswerRecord>) ?? {};

  for (const g of grades) {
    if (answers[g.questionId]) {
      answers[g.questionId] = { ...answers[g.questionId], marksAwarded: g.marksAwarded };
    }
  }

  await db.testAttempt.update({ where: { id: attemptId }, data: { answers: answers as unknown as Prisma.InputJsonValue } });

  const total = Object.values(answers).reduce((sum, a) => sum + (a.marksAwarded ?? 0), 0);
  const allGraded = Object.values(answers).every((a) => a.marksAwarded !== null);

  const result = await db.testResult.update({
    where: { attemptId },
    data: { marksObtained: total, gradedById, gradedAt: allGraded ? new Date() : null },
  });

  if (allGraded) {
    try {
      await checkLowTestScore(result.testId, result.studentId, result.marksObtained, result.totalMarks);
    } catch (err) {
      console.error("checkLowTestScore failed", err);
    }
    try {
      await onTestGraded(result.studentId, result.testId, result.marksObtained, result.totalMarks);
    } catch (err) {
      console.error("onTestGraded failed", err);
    }
  }

  return result;
}

// ---- Analytics ----

export function listResultsForTest(testId: string) {
  return db.testResult.findMany({
    where: { testId },
    include: { student: true },
    orderBy: { marksObtained: "desc" },
  });
}

export async function testResultStats(testId: string) {
  const results = await db.testResult.findMany({ where: { testId, gradedAt: { not: null } } });
  if (results.length === 0) return { average: 0, highest: 0, lowest: 0, gradedCount: 0 };

  const marks = results.map((r) => r.marksObtained);
  return {
    average: Math.round(marks.reduce((s, m) => s + m, 0) / marks.length),
    highest: Math.max(...marks),
    lowest: Math.min(...marks),
    gradedCount: results.length,
  };
}

export async function getAcademyAverageTestScore() {
  const results = await db.testResult.findMany({ where: { gradedAt: { not: null } } });
  if (results.length === 0) return null;
  const percentages = results.map((r) => (r.totalMarks === 0 ? 0 : (r.marksObtained / r.totalMarks) * 100));
  return Math.round(percentages.reduce((s, p) => s + p, 0) / percentages.length);
}

export async function getStudentAverageTestScore(studentId: string) {
  const results = await db.testResult.findMany({ where: { studentId, gradedAt: { not: null } } });
  if (results.length === 0) return null;
  const percentages = results.map((r) => (r.totalMarks === 0 ? 0 : (r.marksObtained / r.totalMarks) * 100));
  return Math.round(percentages.reduce((s, p) => s + p, 0) / percentages.length);
}
