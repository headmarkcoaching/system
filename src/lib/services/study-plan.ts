import "server-only";
import { getAIProvider } from "@/lib/ai";
import * as performanceService from "@/lib/services/performance";
import * as testService from "@/lib/services/tests";
import * as studentService from "@/lib/services/students";
import * as kbService from "@/lib/services/knowledge-base";
import { getLatestSuccessfulInteraction, logAIInteraction } from "@/lib/services/ai-common";

function cacheKey(studentId: string) {
  return `study-plan:${studentId}`;
}

export async function getLatestStudyPlan(studentId: string) {
  return getLatestSuccessfulInteraction(cacheKey(studentId), "STUDY_PLAN");
}

/** Generates (or reuses a still-fresh cached) personalized study plan. Cache invalidates when a
 * newer StudentPerformance snapshot exists since the last plan, or when `force` (Regenerate). */
export async function generateStudyPlan(studentId: string, { requestedByUserId, force = false }: { requestedByUserId: string; force?: boolean }) {
  const [latestPerformance, cached] = await Promise.all([
    performanceService.getLatestPerformance(studentId),
    getLatestStudyPlan(studentId),
  ]);

  const isStale = !cached || (latestPerformance && latestPerformance.calculatedAt > cached.createdAt);
  if (cached && !force && !isStale) {
    return { plan: cached.response ?? "", generatedAt: cached.createdAt, fromCache: true };
  }

  const [context, homework, tests] = await Promise.all([
    studentService.getStudentAIContext(studentId),
    studentService.getStudentHomework(studentId),
    testService.listTestsForStudent(studentId),
  ]);
  if (!context) throw new Error("Student profile not found.");

  const pendingHomework = homework.filter((h) => h.status === "PENDING").slice(0, 5);
  const upcomingTests = tests
    .filter((t) => (t.status === "SCHEDULED" || t.status === "ACTIVE") && !t.attempt && new Date(t.startDate).getTime() - Date.now() < 7 * 86_400_000)
    .slice(0, 5);

  const weakSubjectNames = Array.from(
    new Set(
      tests
        .filter((t) => t.result && t.result.totalMarks > 0 && (t.result.marksObtained / t.result.totalMarks) * 100 < 60)
        .map((t) => t.subject.name)
    )
  );

  const kbQuery = weakSubjectNames.length > 0 ? weakSubjectNames.join(" ") : context.subjectNames.join(" ");
  const relevantDocs = kbQuery ? await kbService.findRelevantDocuments(kbQuery, context.scope) : [];

  const prompt = buildPrompt({ context, pendingHomework, upcomingTests, weakSubjectNames, relevantDocs });
  const provider = getAIProvider();
  const start = Date.now();
  const result = await provider.complete({
    messages: [
      { role: "system", content: "You are a study planner for an online tutoring academy. Ground recommendations in the real data given; never invent assignments or dates not provided." },
      { role: "user", content: prompt },
    ],
    maxTokens: 800,
  });
  const latencyMs = Date.now() - start;

  await logAIInteraction({
    userId: requestedByUserId,
    conversationId: cacheKey(studentId),
    feature: "STUDY_PLAN",
    provider: result.provider,
    model: result.model,
    prompt,
    response: result.status === "SUCCESS" ? result.text : undefined,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    latencyMs,
    status: result.status,
    errorMessage: result.status === "FAILED" ? result.errorMessage : undefined,
  });

  if (result.status === "FAILED") {
    throw new Error(result.errorMessage ?? "Couldn't generate a study plan. Please try again.");
  }

  return { plan: result.text ?? "", generatedAt: new Date(), fromCache: false };
}

function buildPrompt({
  context,
  pendingHomework,
  upcomingTests,
  weakSubjectNames,
  relevantDocs,
}: {
  context: NonNullable<Awaited<ReturnType<typeof studentService.getStudentAIContext>>>;
  pendingHomework: Awaited<ReturnType<typeof studentService.getStudentHomework>>;
  upcomingTests: Awaited<ReturnType<typeof testService.listTestsForStudent>>;
  weakSubjectNames: string[];
  relevantDocs: Awaited<ReturnType<typeof kbService.findRelevantDocuments>>;
}): string {
  const profile = `Student: Academic level ${context.academicLevelName}. Subjects: ${context.subjectNames.join(", ") || "not specified"}.`;

  const homeworkLine = pendingHomework.length > 0
    ? `Pending homework: ${pendingHomework.map((h) => `${h.homework.title} (${h.homework.subject.name}, due ${h.homework.dueDate.toISOString().slice(0, 10)})`).join("; ")}.`
    : "No pending homework.";

  const testsLine = upcomingTests.length > 0
    ? `Upcoming tests (next 7 days, not yet attempted): ${upcomingTests.map((t) => `${t.subject.name}${t.chapter ? ` (${t.chapter})` : ""} on ${new Date(t.startDate).toISOString().slice(0, 10)}`).join("; ")}.`
    : "No upcoming tests in the next 7 days.";

  const weakLine = weakSubjectNames.length > 0 ? `Subjects with recent scores below 60%: ${weakSubjectNames.join(", ")}.` : "No recent weak subjects identified.";

  const groundingBlock = relevantDocs.length > 0
    ? `=== KNOWLEDGE BASE CONTEXT ===\n${relevantDocs.map((d, i) => `[Excerpt ${i + 1} - ${d.title}${d.chapter ? ` / ${d.chapter}` : ""}]\n${d.content.slice(0, 800)}`).join("\n\n")}\n=== END KNOWLEDGE BASE CONTEXT ===`
    : "No approved knowledge-base material matched the student's weak subjects.";

  return [
    profile,
    homeworkLine,
    testsLine,
    weakLine,
    groundingBlock,
    "",
    "Write a study plan for today only, formatted as a short list of time-boxed tasks (e.g. '30 min: Mathematics — revise Chapter 4'), followed by a 'Weekly Goal:' line summarizing one focus for the week.",
    "Prefer referencing the knowledge base excerpts above when they're relevant to a weak subject. If there's genuinely nothing pending or upcoming, say so and suggest general revision of the weakest subject instead.",
  ].join("\n");
}
