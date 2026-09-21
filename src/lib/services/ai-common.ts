import "server-only";
import { db } from "@/lib/db";
import type { AIInteractionFeature } from "@prisma/client";

/** Latest successful interaction for a given cache key (conversationId is reused as an
 * app-controlled cache key here, not a literal chat thread — e.g. `performance-analysis:{studentId}`). */
export function getLatestSuccessfulInteraction(conversationId: string, feature: AIInteractionFeature) {
  return db.aIInteraction.findFirst({
    where: { conversationId, feature, status: "SUCCESS" },
    orderBy: { createdAt: "desc" },
  });
}

export interface LogAIInteractionInput {
  userId?: string;
  conversationId: string;
  feature: AIInteractionFeature;
  provider: string;
  model: string;
  prompt: string;
  response?: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  status: "SUCCESS" | "FAILED";
  errorMessage?: string;
}

/** Non-fatal by design — a logging failure must never crash the primary AI response,
 * same pattern as ai-assistant.ts's askQuestion() and audit.ts's logAudit(). */
export async function logAIInteraction(input: LogAIInteractionInput) {
  try {
    await db.aIInteraction.create({ data: input });
  } catch (error) {
    console.error("Failed to log AI interaction", error);
  }
}
