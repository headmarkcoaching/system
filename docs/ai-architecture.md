# AI Architecture

## Provider abstraction

`src/lib/ai/provider.ts` defines a minimal interface:

```ts
interface AIProvider {
  complete(request: { messages: AIMessage[]; maxTokens?: number }): Promise<AICompletionResult>;
}
```

`src/lib/ai/index.ts` selects the active provider from `AI_PROVIDER` (`console` default, `anthropic`). Every calling service (`ai-assistant.ts`, `study-plan.ts`, `performance-analysis.ts`, `teacher-assistant.ts`, `question-generation.ts`, `exam-prep.ts`, `parent-reports.ts`) depends only on `AIProvider`, never on a specific vendor — swapping providers is a one-file change plus an env var.

- **`ConsoleAIProvider`** (`src/lib/ai/providers/console-provider.ts`) — zero-config default. For Knowledge-Base-grounded features it parses the `=== KNOWLEDGE BASE CONTEXT ===` block out of the prompt and echoes the best-matching excerpt, honestly labeled as not a real model response. For everything else it returns a generic labeled placeholder. This exercises every feature's retrieval, prompt-construction, and logging pipeline with zero credentials.
- **`AnthropicAIProvider`** (`src/lib/ai/providers/anthropic-provider.ts`) — real Claude calls via `@anthropic-ai/sdk`. Needs `ANTHROPIC_API_KEY`; model defaults to `claude-opus-5` (override with `AI_MODEL`). Typed exception handling (`AuthenticationError`/`RateLimitError`/`BadRequestError`/`APIError`) returns a generic, safe error message to the caller while logging the real error server-side only — never leaks provider error details to the client.

## Logging & usage tracking

Every call — success or failure — is logged to `AIInteraction` (`provider`, `model`, `promptTokens`, `completionTokens`, `latencyMs`, `status`, `errorMessage`). Logging itself is non-fatal (wrapped in try/catch in `ai-common.ts`'s `logAIInteraction`) — a logging failure must never crash the actual AI response, since the response is the primary action.

`AIInteractionFeature` tags every interaction by feature (`STUDY_ASSISTANT`, `PERFORMANCE_ANALYSIS`, `STUDY_PLAN`, `PARENT_REPORT_DRAFT`, `TEACHER_ASSISTANT`, `QUESTION_GENERATION`, `INTERVENTION_RECOMMENDATION`). Phase 3E's `src/lib/services/ai-usage.ts` aggregates this table by feature/user/day for `/admin/ai-usage` — no new tracking, purely a reporting layer over data that already existed since Phase 3A.

## Caching pattern

`conversationId` is reused as a deterministic, app-controlled cache key (not a literal chat-thread id) for anything that should reuse its last result rather than re-generate on every page view — e.g. `performance-analysis:{studentId}`, `study-plan:{studentId}`, `exam-prep:{testId}`. `getLatestSuccessfulInteraction(conversationId, feature)` fetches the cached result; a "Regenerate" button forces a fresh call.

## Safety rules (baked into every prompt)

1. Ground answers in approved Knowledge Base content when available; prefer it over general knowledge.
2. State explicitly when no approved material matched, before answering generally.
3. Never invent specific facts, scores, or dates not present in the given context.
4. Decline anything outside educational/academy scope.

## Deliberately not AI

Two features are rule-based by design, not AI calls, because their outputs are concrete, transparent derivations from existing data rather than something needing language synthesis:

- **Smart Next Action Engine** (`src/lib/services/next-actions.ts`)
- **Predictive Risk score** (`src/lib/services/predictive-risk.ts`) — AI is layered on top only to turn its already-computed signals into a readable staff recommendation (`teacher-assistant.ts`'s `suggestInterventionPlan`), never to compute the score itself.

## Cost controls (informational only)

`AIUsageConfig` (singleton, `/admin/ai-usage`) lets staff set a daily token soft cap and a cost-per-1,000-tokens estimate. This is informational — it surfaces a warning banner when today's usage exceeds the cap, it does not block requests. No real billing/metering integration exists to enforce a hard cap.
