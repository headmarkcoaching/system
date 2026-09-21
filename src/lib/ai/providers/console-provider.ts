import "server-only";
import type { AIProvider, AICompletionRequest, AICompletionResult } from "@/lib/ai/provider";

const KB_BLOCK_PATTERN = /=== KNOWLEDGE BASE CONTEXT ===\n([\s\S]*?)\n=== END KNOWLEDGE BASE CONTEXT ===/;

/** Zero-config default — no real AI model configured. Still exercises the whole pipeline
 * honestly (never pretends to be a real model), same philosophy as ConsoleWhatsAppProvider:
 * it echoes the best-matching approved knowledge-base excerpt (parsed out of the system
 * message, kept generic here rather than importing the knowledge-base service directly)
 * so the feature is demonstrable without any credentials. */
export class ConsoleAIProvider implements AIProvider {
  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    const system = request.messages.find((m) => m.role === "system")?.content ?? "";
    const lastUser = [...request.messages].reverse().find((m) => m.role === "user")?.content ?? "";
    const excerptMatch = system.match(KB_BLOCK_PATTERN);

    console.log(`[AI:console] Q: ${lastUser}`);

    const text = excerptMatch
      ? `[Console AI provider — no real AI model configured. Set AI_PROVIDER=anthropic to enable real answers.]\n\nBest-matching approved academy material found for this question:\n\n${excerptMatch[1].split("\n\n")[0]}\n\n(This is a direct excerpt, not a generated answer.)`
      : `[Console AI provider — no real AI model configured, and no approved knowledge-base material matched this question either. Set AI_PROVIDER=anthropic to enable real answers.]`;

    return { status: "SUCCESS", text, provider: "console", model: "console" };
  }
}
