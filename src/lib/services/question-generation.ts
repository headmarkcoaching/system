import "server-only";
import { getAIProvider } from "@/lib/ai";
import * as kbService from "@/lib/services/knowledge-base";
import { logAIInteraction } from "@/lib/services/ai-common";

export const MAX_QUESTIONS = 15;

export type DraftQuestionType = "MCQ" | "SHORT_ANSWER" | "LONG_ANSWER" | "NUMERICAL";

export interface DraftQuestion {
  type: DraftQuestionType;
  questionText: string;
  options: string[];
  correctAnswer: string;
  marks: number;
  topic: string;
}

const VALID_TYPES: DraftQuestionType[] = ["MCQ", "SHORT_ANSWER", "LONG_ANSWER", "NUMERICAL"];

/** Lenient, never-throwing parser for the delimited text format the AI is prompted to return.
 * Skips a whole block rather than throwing if it can't make sense of it. */
export function parseQuestionDraftsText(raw: string): DraftQuestion[] {
  const blocks = raw.split(/^---\s*$/m);
  const drafts: DraftQuestion[] = [];

  for (const block of blocks) {
    const questionText = block.match(/^Q:\s*(.+)$/im)?.[1]?.trim();
    const typeRaw = block.match(/^TYPE:\s*(.+)$/im)?.[1]?.trim().toUpperCase();
    const optionsRaw = block.match(/^OPTIONS:\s*(.+)$/im)?.[1]?.trim();
    const answer = block.match(/^ANSWER:\s*(.+)$/im)?.[1]?.trim();
    const marksRaw = block.match(/^MARKS:\s*(.+)$/im)?.[1]?.trim();
    const topic = block.match(/^TOPIC:\s*(.+)$/im)?.[1]?.trim();

    if (!questionText) continue;
    const type = VALID_TYPES.find((t) => t === typeRaw);
    if (!type) continue;

    const options = type === "MCQ" && optionsRaw ? optionsRaw.split("|").map((o) => o.trim()).filter(Boolean) : [];
    const marks = Number(marksRaw);

    drafts.push({
      type,
      questionText,
      options,
      correctAnswer: answer ?? "",
      marks: Number.isFinite(marks) && marks > 0 ? Math.round(marks) : 1,
      topic: topic ?? "",
    });
  }

  return drafts;
}

export interface GenerateQuestionDraftsInput {
  academicLevelId: string;
  academicLevelName: string;
  subjectId: string;
  subjectName: string;
  chapter?: string;
  difficulty: "easy" | "medium" | "hard";
  type: DraftQuestionType | "MIXED";
  count: number;
  requestedByUserId: string;
}

export async function generateQuestionDrafts(input: GenerateQuestionDraftsInput): Promise<DraftQuestion[]> {
  const count = Math.min(Math.max(1, input.count), MAX_QUESTIONS);

  const relevantDocs = await kbService.findRelevantDocuments(`${input.subjectName} ${input.chapter ?? ""}`, {
    academicLevelId: input.academicLevelId,
    subjectId: input.subjectId,
  });
  const groundingBlock =
    relevantDocs.length > 0
      ? `=== KNOWLEDGE BASE CONTEXT ===\n${relevantDocs.map((d, i) => `[Excerpt ${i + 1} - ${d.title}]\n${d.content.slice(0, 800)}`).join("\n\n")}\n=== END KNOWLEDGE BASE CONTEXT ===`
      : "";

  const userPrompt = [
    `Academic level: ${input.academicLevelName}. Subject: ${input.subjectName}.${input.chapter ? ` Chapter: ${input.chapter}.` : ""}`,
    `Difficulty: ${input.difficulty}. Question type: ${input.type === "MIXED" ? "a mix of MCQ, Short Answer, Long Answer, and Numerical" : input.type}.`,
    groundingBlock,
    "",
    `Generate exactly ${count} question(s). Respond with ONLY the questions, one per block, separated by a line containing only "---". Each block in exactly this format:`,
    "Q: <question text>",
    "TYPE: MCQ|SHORT_ANSWER|LONG_ANSWER|NUMERICAL",
    "OPTIONS: option one | option two | option three | option four",
    "ANSWER: <correct answer>",
    "MARKS: <integer>",
    "TOPIC: <a short specific topic within the chapter this question tests, e.g. 'Newton's Third Law'>",
    "(OPTIONS only applies to MCQ questions — omit it for other types.)",
  ]
    .filter(Boolean)
    .join("\n");

  const provider = getAIProvider();
  const start = Date.now();
  const result = await provider.complete({
    messages: [
      { role: "system", content: "You write academic test questions for an online tutoring academy. Ground questions in the knowledge base context when given; never invent facts outside the subject/chapter given." },
      { role: "user", content: userPrompt },
    ],
    maxTokens: 200 * count + 200,
  });
  const latencyMs = Date.now() - start;

  await logAIInteraction({
    userId: input.requestedByUserId,
    conversationId: `question-generation:${input.requestedByUserId}:${Date.now()}`,
    feature: "QUESTION_GENERATION",
    provider: result.provider,
    model: result.model,
    prompt: userPrompt,
    response: result.status === "SUCCESS" ? result.text : undefined,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    latencyMs,
    status: result.status,
    errorMessage: result.status === "FAILED" ? result.errorMessage : undefined,
  });

  if (result.status === "FAILED") {
    throw new Error(result.errorMessage ?? "Couldn't generate questions. Please try again.");
  }

  return parseQuestionDraftsText(result.text ?? "");
}
