import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, AIMessage, AICompletionRequest, AICompletionResult } from "@/lib/ai/provider";

const MODEL = process.env.AI_MODEL || "claude-opus-5";

export class AnthropicAIProvider implements AIProvider {
  private client = new Anthropic(); // resolves ANTHROPIC_API_KEY from env

  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    const system = request.messages.find((m) => m.role === "system")?.content;
    const conversation = request.messages
      .filter((m): m is AIMessage & { role: "user" | "assistant" } => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await this.client.messages.create({
        model: MODEL,
        max_tokens: request.maxTokens ?? 1024,
        system,
        messages: conversation,
      });
      const textBlock = res.content.find((b) => b.type === "text");
      return {
        status: "SUCCESS",
        text: textBlock && textBlock.type === "text" ? textBlock.text : "",
        promptTokens: res.usage?.input_tokens,
        completionTokens: res.usage?.output_tokens,
        provider: "anthropic",
        model: MODEL,
      };
    } catch (error) {
      let errorMessage = "The AI assistant is temporarily unavailable.";
      if (error instanceof Anthropic.AuthenticationError) errorMessage = "AI provider authentication failed.";
      else if (error instanceof Anthropic.RateLimitError) errorMessage = "AI provider is rate-limited — try again shortly.";
      else if (error instanceof Anthropic.BadRequestError) errorMessage = "AI provider rejected the request.";
      else if (error instanceof Anthropic.APIError) errorMessage = "AI provider returned an error.";
      console.error("AnthropicAIProvider.complete failed", error);
      return { status: "FAILED", provider: "anthropic", model: MODEL, errorMessage };
    }
  }
}
