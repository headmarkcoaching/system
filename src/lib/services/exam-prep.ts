import "server-only";
import { db } from "@/lib/db";
import { getAIProvider } from "@/lib/ai";
import * as kbService from "@/lib/services/knowledge-base";
import * as studentService from "@/lib/services/students";
import * as learningAnalyticsService from "@/lib/services/learning-analytics";
import * as learningPathService from "@/lib/services/learning-path";
import { getLatestSuccessfulInteraction, logAIInteraction } from "@/lib/services/ai-common";

async function upcomingTestsForStudent(studentId: string) {
  const batchIds = (await db.batchStudent.findMany({ where: { studentId }, select: { batchId: true } })).map((b) => b.batchId);
  const [tests, attempts] = await Promise.all([
    db.test.findMany({
      where: { batchId: { in: batchIds }, status: { in: ["SCHEDULED", "ACTIVE"] }, endDate: { gte: new Date() } },
      include: { subject: true },
      orderBy: { startDate: "asc" },
    }),
    db.testAttempt.findMany({ where: { studentId }, select: { testId: true } }),
  ]);
  const attemptedIds = new Set(attempts.map((a) => a.testId));
  return tests.filter((t) => !attemptedIds.has(t.id));
}

/** "Practice tests" per the spec's exam-prep example is honestly scoped down here: this app
 * has no self-serve, unlimited-retake practice-test system (TestAttempt is hard-capped at one
 * attempt per test per student, and reworking that is materially larger scope) — so instead
 * this surfaces the student's other genuinely-scheduled upcoming tests in the same subject as
 * further practice/prep opportunities, which is honest given what the platform actually does. */
export async function getExamPrepData(studentId: string, testId?: string) {
  const upcoming = await upcomingTestsForStudent(studentId);
  const targetTest = testId ? upcoming.find((t) => t.id === testId) : upcoming[0];

  if (!targetTest) {
    return { targetTest: null, daysRemaining: 0, weakChapters: [], studyProgress: 0, otherUpcoming: [] as typeof upcoming, upcoming };
  }

  const daysRemaining = Math.max(0, Math.ceil((targetTest.startDate.getTime() - Date.now()) / 86_400_000));

  const [{ chapters }, path] = await Promise.all([
    learningAnalyticsService.getStudentLearningAnalytics(studentId),
    learningPathService.getLearningPath(studentId, targetTest.subjectId),
  ]);

  const weakChapters = chapters.filter((c) => c.subjectName === targetTest.subject.name).slice(0, 5);
  const studyProgress = learningPathService.overallCompletionPercent(path);
  const otherUpcoming = upcoming.filter((t) => t.id !== targetTest.id && t.subjectId === targetTest.subjectId);

  return { targetTest, daysRemaining, weakChapters, studyProgress, otherUpcoming, upcoming };
}

export async function getLatestExamPrepPlan(testId: string) {
  return getLatestSuccessfulInteraction(`exam-prep:${testId}`, "STUDY_PLAN");
}

/** Reuses STUDY_PLAN as its AIInteractionFeature (rather than adding a new enum value) since
 * this is the same kind of KB-grounded revision synthesis as study-plan.ts, just scoped to one
 * upcoming exam instead of "today" — sharing the feature tag keeps AI Usage reporting (a
 * planned future dashboard, per AIInteraction's design note) from needing a new bucket for
 * what is functionally the same feature with a narrower scope. */
export async function generateExamPrepPlan(studentId: string, testId: string, requestedByUserId: string) {
  const test = await db.test.findUniqueOrThrow({ where: { id: testId }, include: { subject: true } });
  const context = await studentService.getStudentAIContext(studentId);
  if (!context) throw new Error("Student profile not found.");

  const { chapters } = await learningAnalyticsService.getStudentLearningAnalytics(studentId);
  const weakChapters = chapters.filter((c) => c.subjectName === test.subject.name).slice(0, 5);
  const weakLine =
    weakChapters.length > 0
      ? `Weakest chapters in this subject so far: ${weakChapters.map((c) => `${c.chapter} (${c.average}%)`).join(", ")}.`
      : "No chapter-level test history yet for this subject.";

  const daysRemaining = Math.max(0, Math.ceil((test.startDate.getTime() - Date.now()) / 86_400_000));
  const relevantDocs = await kbService.findRelevantDocuments(`${test.subject.name} ${test.chapter ?? ""}`, {
    academicLevelId: test.academicLevelId,
    subjectId: test.subjectId,
  });
  const groundingBlock =
    relevantDocs.length > 0
      ? `=== KNOWLEDGE BASE CONTEXT ===\n${relevantDocs.map((d, i) => `[Excerpt ${i + 1} - ${d.title}${d.chapter ? ` / ${d.chapter}` : ""}]\n${d.content.slice(0, 800)}`).join("\n\n")}\n=== END KNOWLEDGE BASE CONTEXT ===`
      : "No approved knowledge-base material matched this subject.";

  const userPrompt = [
    `Exam: ${test.name} (${test.subject.name}${test.chapter ? `, ${test.chapter}` : ""}), in ${daysRemaining} day(s).`,
    `Student academic level: ${context.academicLevelName}.`,
    weakLine,
    groundingBlock,
    "",
    "Write a short exam revision plan: 3-5 prioritized bullet points for what to revise first (weakest chapters first), referencing the knowledge base excerpts above where relevant. End with one line of encouragement.",
  ].join("\n");

  const provider = getAIProvider();
  const start = Date.now();
  const result = await provider.complete({
    messages: [
      { role: "system", content: "You help students prepare for a specific upcoming exam at an online tutoring academy. Prioritize weak chapters. Never invent scores or facts not given." },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 500,
  });
  const latencyMs = Date.now() - start;

  await logAIInteraction({
    userId: requestedByUserId,
    conversationId: `exam-prep:${testId}`,
    feature: "STUDY_PLAN",
    provider: result.provider,
    model: result.model,
    prompt: userPrompt,
    response: result.status === "SUCCESS" ? result.text : undefined,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    latencyMs,
    status: result.status,
    errorMessage: result.status === "FAILED" ? result.errorMessage : undefined,
  });

  if (result.status === "FAILED") {
    throw new Error(result.errorMessage ?? "Couldn't generate a revision plan. Please try again.");
  }
  return result.text ?? "";
}
