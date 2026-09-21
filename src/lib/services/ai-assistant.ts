import "server-only";
import { db } from "@/lib/db";
import { getAIProvider } from "@/lib/ai";
import type { AIMessage } from "@/lib/ai/provider";
import { findRelevantDocuments, type RankedDocument, type StudentAIScope } from "@/lib/services/knowledge-base";

export interface StudentAIContext {
  academicLevelName: string;
  boardName?: string | null;
  groupName?: string | null;
  programName?: string | null;
  subjectNames: string[];
  scope: StudentAIScope;
}

export interface AskQuestionInput {
  userId: string;
  conversationId: string;
  question: string;
  studentContext: StudentAIContext;
}

export interface AskQuestionResult {
  answer: string;
  groundedInKnowledgeBase: boolean;
  matchedDocumentTitles: string[];
}

const MAX_HISTORY_TURNS = 10;

export async function askQuestion(input: AskQuestionInput): Promise<AskQuestionResult> {
  const relevant = await findRelevantDocuments(input.question, input.studentContext.scope);

  const history = await db.aIInteraction.findMany({
    where: { conversationId: input.conversationId, userId: input.userId, status: "SUCCESS" },
    orderBy: { createdAt: "asc" },
    take: MAX_HISTORY_TURNS,
  });

  const messages: AIMessage[] = [
    { role: "system", content: buildSystemPrompt(input.studentContext, relevant) },
    ...history.flatMap((h): AIMessage[] => [
      { role: "user", content: h.prompt },
      ...(h.response ? [{ role: "assistant" as const, content: h.response }] : []),
    ]),
    { role: "user", content: input.question },
  ];

  const provider = getAIProvider();
  const start = Date.now();
  const result = await provider.complete({ messages, maxTokens: 1024 });
  const latencyMs = Date.now() - start;

  // Logging is best-effort: a write failure here must never crash the chat response
  // (same non-fatal pattern as logAudit).
  try {
    await db.aIInteraction.create({
      data: {
        userId: input.userId,
        conversationId: input.conversationId,
        feature: "STUDY_ASSISTANT",
        provider: result.provider,
        model: result.model,
        prompt: input.question,
        response: result.status === "SUCCESS" ? result.text : null,
        promptTokens: result.promptTokens,
        completionTokens: result.completionTokens,
        latencyMs,
        status: result.status,
        errorMessage: result.status === "FAILED" ? result.errorMessage : null,
      },
    });
  } catch (error) {
    console.error("Failed to log AI interaction", error);
  }

  // Unlike logging, the AI call IS the primary action — its failure must surface to the
  // caller, not be silently swallowed.
  if (result.status === "FAILED") {
    throw new Error(result.errorMessage ?? "Couldn't get an answer from the AI assistant. Please try again.");
  }

  return {
    answer: result.text ?? "",
    groundedInKnowledgeBase: relevant.length > 0,
    matchedDocumentTitles: relevant.map((d) => d.title),
  };
}

function buildSystemPrompt(ctx: StudentAIContext, docs: RankedDocument[]): string {
  const profile =
    `Student profile: Academic level ${ctx.academicLevelName}` +
    `${ctx.boardName ? `, ${ctx.boardName} board` : ""}` +
    `${ctx.groupName ? `, ${ctx.groupName} group` : ""}` +
    `${ctx.programName ? `, enrolled in ${ctx.programName}` : ""}. ` +
    `Subjects: ${ctx.subjectNames.length ? ctx.subjectNames.join(", ") : "not specified"}.`;

  const groundingBlock =
    docs.length > 0
      ? `=== KNOWLEDGE BASE CONTEXT ===\n${docs
          .map((d, i) => `[Excerpt ${i + 1} - ${d.title}${d.chapter ? ` / ${d.chapter}` : ""}]\n${d.content.slice(0, 1500)}`)
          .join("\n\n")}\n=== END KNOWLEDGE BASE CONTEXT ===`
      : "No approved knowledge-base material matched this question.";

  return [
    "You are the AI Study Assistant for Head Mark Coaching, an online tutoring platform.",
    profile,
    "Rules you must follow:",
    "1. Pitch every answer at the student's stated academic level.",
    "2. If KNOWLEDGE BASE CONTEXT below contains excerpts relevant to the question, ground your answer in them and prefer them over general knowledge.",
    "3. If no context is provided, or it doesn't cover the question, say so explicitly first (e.g. 'I don't have approved academy material on this, so here's a general explanation:') before answering generally.",
    "4. Never invent specific facts, figures, dates, or citations. If you are not confident, say so explicitly instead of guessing.",
    "5. Only answer questions within academic/educational scope for this student. Politely decline anything else (personal, medical, financial, unrelated) and suggest they contact a teacher or raise a support ticket.",
    groundingBlock,
  ].join("\n\n");
}
