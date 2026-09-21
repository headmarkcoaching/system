// Provider-agnostic AI completion interface. Any AI feature (Study Assistant now;
// Performance Analysis, Study Plans, Parent Reports, Teacher Assistant, Question
// Generation in a later phase) calls through this same shape — swapping providers is a
// one-file change plus an env var, never a rewrite of the calling code.

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AICompletionRequest {
  messages: AIMessage[]; // include the system prompt as the first "system"-role message
  maxTokens?: number;
}

export interface AICompletionResult {
  status: "SUCCESS" | "FAILED";
  text?: string;
  promptTokens?: number;
  completionTokens?: number;
  provider: string;
  model: string;
  errorMessage?: string;
}

export interface AIProvider {
  complete(request: AICompletionRequest): Promise<AICompletionResult>;
}
