import "server-only";
import { getAIProvider } from "@/lib/ai";
import * as performanceService from "@/lib/services/performance";
import * as testService from "@/lib/services/tests";
import * as engagementService from "@/lib/services/engagement";
import * as studentService from "@/lib/services/students";
import { getLatestSuccessfulInteraction, logAIInteraction } from "@/lib/services/ai-common";

function cacheKey(studentId: string) {
  return `performance-analysis:${studentId}`;
}

export async function getLatestPerformanceAnalysis(studentId: string) {
  return getLatestSuccessfulInteraction(cacheKey(studentId), "PERFORMANCE_ANALYSIS");
}

/** Generates (or reuses a still-fresh cached) AI narrative analysis of a student's performance.
 * Cache is reused unless a newer StudentPerformance snapshot exists since the last analysis, or
 * `force` (Regenerate) is passed. Not KB-grounded — this is stats synthesis, not content lookup. */
export async function generatePerformanceAnalysis(studentId: string, { requestedByUserId, force = false }: { requestedByUserId: string; force?: boolean }) {
  const [latestPerformance, cached] = await Promise.all([
    performanceService.getLatestPerformance(studentId),
    getLatestPerformanceAnalysis(studentId),
  ]);

  const isStale = !cached || (latestPerformance && latestPerformance.calculatedAt > cached.createdAt);
  if (cached && !force && !isStale) {
    return { analysis: cached.response ?? "", generatedAt: cached.createdAt, fromCache: true };
  }

  const [context, history, testAverage, engagement] = await Promise.all([
    studentService.getStudentAIContext(studentId),
    performanceService.getPerformanceHistory(studentId),
    testService.getStudentAverageTestScore(studentId),
    engagementService.getLatestEngagementScore(studentId),
  ]);

  const prompt = buildPrompt({ context, latestPerformance, history, testAverage, engagement });
  const provider = getAIProvider();
  const start = Date.now();
  const result = await provider.complete({
    messages: [
      { role: "system", content: "You are an academic performance analyst for an online tutoring academy. Be concrete, evidence-based, and never invent numbers not given to you." },
      { role: "user", content: prompt },
    ],
    maxTokens: 800,
  });
  const latencyMs = Date.now() - start;

  await logAIInteraction({
    userId: requestedByUserId,
    conversationId: cacheKey(studentId),
    feature: "PERFORMANCE_ANALYSIS",
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
    throw new Error(result.errorMessage ?? "Couldn't generate a performance analysis. Please try again.");
  }

  return { analysis: result.text ?? "", generatedAt: new Date(), fromCache: false };
}

function buildPrompt({
  context,
  latestPerformance,
  history,
  testAverage,
  engagement,
}: {
  context: Awaited<ReturnType<typeof studentService.getStudentAIContext>>;
  latestPerformance: Awaited<ReturnType<typeof performanceService.getLatestPerformance>>;
  history: Awaited<ReturnType<typeof performanceService.getPerformanceHistory>>;
  testAverage: number | null;
  engagement: Awaited<ReturnType<typeof engagementService.getLatestEngagementScore>>;
}): string {
  const profile = context
    ? `Student: Academic level ${context.academicLevelName}${context.boardName ? `, ${context.boardName} board` : ""}. Subjects: ${context.subjectNames.join(", ") || "not specified"}.`
    : "Student profile not available.";

  const latest = latestPerformance
    ? `Latest performance snapshot (${latestPerformance.category}): overall ${latestPerformance.overallScore}/100, attendance component ${Math.round(latestPerformance.attendanceScore)}, homework component ${Math.round(latestPerformance.homeworkScore)}, test component ${Math.round(latestPerformance.testScore)}, participation component ${Math.round(latestPerformance.participationScore)}.`
    : "No performance snapshot has been calculated yet.";

  const trend = history.length > 1
    ? `Historical overall scores, most recent first: ${history.map((h) => h.overallScore).join(", ")}.`
    : "Not enough history to show a trend yet.";

  const testLine = testAverage != null ? `Average test score across all graded tests: ${testAverage}%.` : "No graded tests yet.";
  const engagementLine = engagement ? `Latest engagement status: ${engagement.status} (score ${Math.round(engagement.score)}/100).` : "No engagement score calculated yet.";

  return [
    profile,
    latest,
    trend,
    testLine,
    engagementLine,
    "",
    "Based only on the data above, write a short analysis with these exact section headers, each 1-3 sentences:",
    "STRENGTHS:",
    "WEAK AREAS:",
    "PERFORMANCE TREND:",
    "RISK FACTORS:",
    "RECOMMENDED ACTIONS:",
    "If a section has nothing notable to say given the data, say so briefly rather than inventing detail.",
  ].join("\n");
}
