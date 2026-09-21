import "server-only";
import { db } from "@/lib/db";
import type { AIInteractionFeature } from "@prisma/client";
import { getAIProvider } from "@/lib/ai";
import * as performanceService from "@/lib/services/performance";
import * as studentService from "@/lib/services/students";
import * as kbService from "@/lib/services/knowledge-base";
import * as analyticsService from "@/lib/services/analytics";
import * as engagementService from "@/lib/services/engagement";
import * as riskService from "@/lib/services/predictive-risk";
import { getLatestSuccessfulInteraction, logAIInteraction } from "@/lib/services/ai-common";

async function callAI(input: { userId: string; feature: AIInteractionFeature; conversationId: string; systemPrompt: string; userPrompt: string; maxTokens?: number }) {
  const provider = getAIProvider();
  const start = Date.now();
  const result = await provider.complete({
    messages: [
      { role: "system", content: input.systemPrompt },
      { role: "user", content: input.userPrompt },
    ],
    maxTokens: input.maxTokens ?? 600,
  });
  const latencyMs = Date.now() - start;

  await logAIInteraction({
    userId: input.userId,
    conversationId: input.conversationId,
    feature: input.feature,
    provider: result.provider,
    model: result.model,
    prompt: input.userPrompt,
    response: result.status === "SUCCESS" ? result.text : undefined,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    latencyMs,
    status: result.status,
    errorMessage: result.status === "FAILED" ? result.errorMessage : undefined,
  });

  if (result.status === "FAILED") {
    throw new Error(result.errorMessage ?? "The AI assistant is temporarily unavailable. Please try again.");
  }
  return result.text ?? "";
}

export interface SuggestHomeworkDraftInput {
  subjectId: string;
  subjectName: string;
  chapter?: string;
  focusHint?: string;
  requestedByUserId: string;
}

export interface HomeworkDraft {
  title: string;
  description: string;
  chapter: string;
}

export async function suggestHomeworkDraft(input: SuggestHomeworkDraftInput): Promise<HomeworkDraft> {
  const userPrompt = [
    `Subject: ${input.subjectName}.`,
    input.chapter ? `Chapter: ${input.chapter}.` : "",
    input.focusHint ? `Focus: ${input.focusHint}.` : "",
    "",
    "Draft a homework assignment. Respond in exactly this format:",
    "TITLE: <short title>",
    "DESCRIPTION: <2-4 sentence instructions for the student>",
  ]
    .filter(Boolean)
    .join("\n");

  const text = await callAI({
    userId: input.requestedByUserId,
    feature: "TEACHER_ASSISTANT",
    conversationId: `teacher-assistant:homework-draft:${input.requestedByUserId}:${Date.now()}`,
    systemPrompt: "You help teachers draft homework assignments for an online tutoring academy. Be concrete and age-appropriate; never invent a due date or marks — the teacher sets those.",
    userPrompt,
  });

  const title = text.match(/TITLE:\s*(.+)/i)?.[1]?.trim() || `${input.subjectName} Homework`;
  const description = text.match(/DESCRIPTION:\s*([\s\S]+)/i)?.[1]?.trim() || text.trim();

  return { title, description, chapter: input.chapter ?? "" };
}

export async function suggestRevisionTopics(studentId: string, requestedByUserId: string) {
  const [context, latestPerformance] = await Promise.all([studentService.getStudentAIContext(studentId), performanceService.getLatestPerformance(studentId)]);
  if (!context) throw new Error("Student profile not found.");

  const weakSignal = latestPerformance
    ? `Latest performance: overall ${latestPerformance.overallScore} (${latestPerformance.category}), attendance ${Math.round(latestPerformance.attendanceScore)}, homework ${Math.round(latestPerformance.homeworkScore)}, tests ${Math.round(latestPerformance.testScore)}.`
    : "No performance snapshot calculated yet.";

  const relevantDocs = await kbService.findRelevantDocuments(context.subjectNames.join(" "), context.scope);
  const groundingBlock =
    relevantDocs.length > 0
      ? `=== KNOWLEDGE BASE CONTEXT ===\n${relevantDocs.map((d, i) => `[Excerpt ${i + 1} - ${d.title}]\n${d.content.slice(0, 800)}`).join("\n\n")}\n=== END KNOWLEDGE BASE CONTEXT ===`
      : "No approved knowledge-base material matched this student's subjects.";

  const userPrompt = [
    `Student: Academic level ${context.academicLevelName}. Subjects: ${context.subjectNames.join(", ") || "not specified"}.`,
    weakSignal,
    groundingBlock,
    "",
    "Suggest 3-5 specific revision topics for this student's teacher to focus on next, as a short bulleted list, referencing the knowledge base excerpts above where relevant.",
  ].join("\n");

  return callAI({
    userId: requestedByUserId,
    feature: "TEACHER_ASSISTANT",
    conversationId: `teacher-assistant:revision-topics:${studentId}:${Date.now()}`,
    systemPrompt: "You help teachers plan revision priorities for individual students at an online tutoring academy. Ground suggestions in the data given; never invent scores.",
    userPrompt,
  });
}

export async function generateLessonSummary(input: { subjectName: string; chapter: string; sourceText: string; requestedByUserId: string }) {
  const userPrompt = [
    `Subject: ${input.subjectName}. Chapter: ${input.chapter}.`,
    "",
    "Source notes:",
    input.sourceText,
    "",
    "Write a concise lesson summary (5-8 sentences) a teacher could share with students as a recap.",
  ].join("\n");

  return callAI({
    userId: input.requestedByUserId,
    feature: "TEACHER_ASSISTANT",
    conversationId: `teacher-assistant:lesson-summary:${input.requestedByUserId}:${Date.now()}`,
    systemPrompt: "You summarize lesson content for teachers at an online tutoring academy. Only use the source notes given — never add facts not present in them.",
    userPrompt,
    maxTokens: 500,
  });
}

export async function getLatestDifficultQuestionsExplanation(testId: string) {
  return getLatestSuccessfulInteraction(`teacher-assistant:difficult-questions:${testId}`, "TEACHER_ASSISTANT");
}

export async function explainDifficultQuestions(testId: string, requestedByUserId: string) {
  const test = await db.test.findUniqueOrThrow({ where: { id: testId }, include: { subject: true } });
  const analytics = await analyticsService.questionAnalytics(testId);
  const difficult = analytics.filter((q) => q.isDifficult);

  if (difficult.length === 0) {
    return "No questions on this test are currently flagged as difficult (below 40% average).";
  }

  const userPrompt = [
    `Test: ${test.name} (${test.subject.name}).`,
    "Difficult questions (below 40% average), hardest first:",
    ...difficult.map((q, i) => `${i + 1}. [${q.type}, ${q.scorePercent}% average, ${q.totalAnswers} answers] ${q.questionText}`),
    "",
    "For each question, suggest one likely reason students struggled (e.g. wording, a specific misconception, missing prerequisite) based only on the question text and type given — do not invent details about the class you weren't told.",
  ].join("\n");

  const text = await callAI({
    userId: requestedByUserId,
    feature: "TEACHER_ASSISTANT",
    conversationId: `teacher-assistant:difficult-questions:${testId}`,
    systemPrompt: "You help teachers understand why test questions were difficult for students, based only on the question text and stats given.",
    userPrompt,
    maxTokens: 700,
  });

  return text;
}

export interface InterventionPlanDraft {
  reason: string;
  actionPlan: string;
}

/** Drafts a reason + action plan for a new Intervention from this student's predictive risk
 * signals (predictive-risk.ts's transparent, rule-based score) plus performance/engagement
 * history — the risk *score* itself stays deterministic and inspectable; AI is used only to
 * turn those already-computed signals into a readable staff recommendation, same split as
 * Performance Analysis (stats synthesis) vs. the Smart Next Action Engine (no AI at all). */
export async function suggestInterventionPlan(studentId: string, requestedByUserId: string): Promise<InterventionPlanDraft> {
  const [student, risk, latestPerformance, engagement] = await Promise.all([
    db.student.findUniqueOrThrow({ where: { id: studentId }, select: { fullName: true } }),
    riskService.getLatestRiskScore(studentId),
    performanceService.getLatestPerformance(studentId),
    engagementService.getLatestEngagementScore(studentId),
  ]);

  const signalLines = [
    risk ? `Predictive risk score: ${risk.score}/100 (${risk.riskLevel}). Signals: ${(risk.signals as string[]).join(" ")}` : "No predictive risk score calculated yet.",
    latestPerformance
      ? `Latest performance: overall ${latestPerformance.overallScore} (${latestPerformance.category}), attendance ${Math.round(latestPerformance.attendanceScore)}%, homework ${Math.round(latestPerformance.homeworkScore)}%, tests ${Math.round(latestPerformance.testScore)}%.`
      : "No performance snapshot calculated yet.",
    engagement ? `Engagement score: ${Math.round(engagement.score)}/100 (${engagement.status}).` : "No engagement score calculated yet.",
  ].join("\n");

  const userPrompt = [
    `Student: ${student.fullName}.`,
    signalLines,
    "",
    "Based only on the signals above, draft a staff intervention. Respond in exactly this format:",
    "REASON: <one sentence naming the concern, e.g. what's declining or at risk>",
    "ACTION PLAN: <2-4 concrete, specific steps a teacher/counselor could take, referencing the actual signals above>",
  ].join("\n");

  const text = await callAI({
    userId: requestedByUserId,
    feature: "INTERVENTION_RECOMMENDATION",
    conversationId: `intervention-recommendation:${studentId}:${Date.now()}`,
    systemPrompt: "You help academy staff draft student intervention plans. Ground every recommendation strictly in the signals given; never invent scores, dates, or facts not present in them.",
    userPrompt,
    maxTokens: 400,
  });

  const reason = text.match(/REASON:\s*(.+)/i)?.[1]?.trim() || `Follow-up needed for ${student.fullName}`;
  const actionPlan = text.match(/ACTION PLAN:\s*([\s\S]+)/i)?.[1]?.trim() || text.trim();

  return { reason, actionPlan };
}
