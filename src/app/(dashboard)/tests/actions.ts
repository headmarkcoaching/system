"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRoleSession, requireSession } from "@/lib/session";
import { ACADEMIC_STAFF_ROLES } from "@/lib/permissions";
import { assertCanManageTest, assertCanManageBatch } from "@/lib/access";
import { logAudit } from "@/lib/audit";
import * as testService from "@/lib/services/tests";
import * as studentService from "@/lib/services/students";
import * as questionGenerationService from "@/lib/services/question-generation";
import * as teacherAssistantService from "@/lib/services/teacher-assistant";

function revalidateTest(id: string) {
  revalidatePath(`/tests/${id}`);
  revalidatePath("/student/tests");
}

// ---- Test CRUD ----

const createTestSchema = z.object({
  name: z.string().min(2, "Test name is required"),
  academicLevelId: z.string().min(1, "Academic level is required"),
  subjectId: z.string().min(1, "Subject is required"),
  chapter: z.string().optional(),
  batchId: z.string().min(1, "Batch is required"),
  totalMarks: z.coerce.number().int().min(1, "Total marks is required"),
  passingMarks: z.coerce.number().int().min(0, "Passing marks is required"),
  durationMinutes: z.coerce.number().int().min(1, "Duration is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

export async function createTestAction(batchId: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  await assertCanManageBatch(session, batchId);

  const parsed = createTestSchema.safeParse({ ...data, batchId });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const test = await testService.createTest({ ...parsed.data, createdById: session.user.id });
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "Test", entityId: test.id, after: test });

  revalidatePath(`/batches/${batchId}`);
  return { testId: test.id };
}

export async function updateTestAction(id: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  await assertCanManageTest(session, id);

  const parsed = createTestSchema.omit({ batchId: true }).partial().safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const record = await testService.updateTest(id, parsed.data);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "Test", entityId: id, after: record });
  revalidateTest(id);
}

export async function updateTestStatusAction(id: string, status: "DRAFT" | "SCHEDULED" | "ACTIVE" | "COMPLETED" | "ARCHIVED") {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  await assertCanManageTest(session, id);
  await testService.updateTestStatus(id, status);
  revalidateTest(id);
}

// ---- Questions ----

const questionSchema = z.object({
  type: z.enum(["MCQ", "SHORT_ANSWER", "LONG_ANSWER", "NUMERICAL"]),
  questionText: z.string().min(2, "Question text is required"),
  optionsText: z.string().optional(),
  correctAnswer: z.string().optional(),
  marks: z.coerce.number().int().min(1, "Marks is required"),
  topic: z.string().optional(),
});

export async function addQuestionAction(testId: string, order: number, data: Record<string, unknown>) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  await assertCanManageTest(session, testId);

  const parsed = questionSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const options =
    parsed.data.type === "MCQ" && parsed.data.optionsText
      ? parsed.data.optionsText.split("\n").map((o) => o.trim()).filter(Boolean)
      : undefined;

  await testService.addQuestion({
    testId,
    type: parsed.data.type,
    questionText: parsed.data.questionText,
    options,
    correctAnswer: parsed.data.correctAnswer || undefined,
    marks: parsed.data.marks,
    topic: parsed.data.topic || undefined,
    order,
  });
  revalidateTest(testId);
}

export async function generateQuestionDraftsAction(
  testId: string,
  input: { difficulty: "easy" | "medium" | "hard"; type: "MCQ" | "SHORT_ANSWER" | "LONG_ANSWER" | "NUMERICAL" | "MIXED"; count: number }
) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  await assertCanManageTest(session, testId);

  const test = await testService.getTestById(testId);
  if (!test) throw new Error("Test not found.");

  return questionGenerationService.generateQuestionDrafts({
    academicLevelId: test.academicLevelId,
    academicLevelName: test.academicLevel.name,
    subjectId: test.subjectId,
    subjectName: test.subject.name,
    chapter: test.chapter ?? undefined,
    difficulty: input.difficulty,
    type: input.type,
    count: input.count,
    requestedByUserId: session.user.id,
  });
}

export async function explainDifficultQuestionsAction(testId: string) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  await assertCanManageTest(session, testId);
  return teacherAssistantService.explainDifficultQuestions(testId, session.user.id);
}

export async function updateQuestionAction(testId: string, questionId: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  await assertCanManageTest(session, testId);

  const parsed = questionSchema.partial().safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const options =
    parsed.data.type === "MCQ" && parsed.data.optionsText
      ? parsed.data.optionsText.split("\n").map((o) => o.trim()).filter(Boolean)
      : undefined;

  await testService.updateQuestion(questionId, {
    type: parsed.data.type,
    questionText: parsed.data.questionText,
    options,
    correctAnswer: parsed.data.correctAnswer,
    marks: parsed.data.marks,
    topic: parsed.data.topic,
  });
  revalidateTest(testId);
}

export async function deleteQuestionAction(testId: string, questionId: string) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  await assertCanManageTest(session, testId);
  await testService.deleteQuestion(questionId);
  revalidateTest(testId);
}

// ---- Taking a test ----

export async function startTestAttemptAction(testId: string) {
  const session = await requireSession();
  if (session.user.role !== "STUDENT") throw new Error("Only students can attempt tests.");
  const student = await studentService.getStudentByUserId(session.user.id);
  if (!student) throw new Error("No student profile linked to this account.");

  await testService.startTestAttempt(testId, student.id);
  revalidatePath(`/student/tests/${testId}`);
}

export async function submitTestAttemptAction(testId: string, attemptId: string, answers: Record<string, string>) {
  const session = await requireSession();
  if (session.user.role !== "STUDENT") throw new Error("Only students can submit tests.");
  const student = await studentService.getStudentByUserId(session.user.id);
  if (!student) throw new Error("No student profile linked to this account.");

  await testService.submitTestAttempt(attemptId, student.id, answers);
  revalidatePath(`/student/tests/${testId}`);
  revalidatePath("/student/tests");
}

// ---- Grading ----

const gradeSchema = z.object({
  grades: z.array(z.object({ questionId: z.string(), marksAwarded: z.number().min(0) })),
});

export async function gradeSubjectiveAction(testId: string, attemptId: string, grades: { questionId: string; marksAwarded: number }[]) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  await assertCanManageTest(session, testId);

  const parsed = gradeSchema.safeParse({ grades });
  if (!parsed.success) return { error: "Invalid grading data." };

  await testService.gradeSubjectiveAnswers(attemptId, session.user.id, parsed.data.grades);
  revalidateTest(testId);
}
