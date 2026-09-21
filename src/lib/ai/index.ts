import "server-only";
import type { AIProvider } from "@/lib/ai/provider";
import { ConsoleAIProvider } from "@/lib/ai/providers/console-provider";
import { AnthropicAIProvider } from "@/lib/ai/providers/anthropic-provider";

export function getAIProvider(): AIProvider {
  switch (process.env.AI_PROVIDER) {
    case "anthropic":
      return new AnthropicAIProvider();
    default:
      return new ConsoleAIProvider();
  }
}

export type { AIProvider, AIMessage, AICompletionRequest, AICompletionResult } from "@/lib/ai/provider";
