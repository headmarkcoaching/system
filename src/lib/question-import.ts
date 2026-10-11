import type { QuestionDifficulty, QuestionType } from "@prisma/client";

export interface ImportedQuestion {
  type: QuestionType;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  marks: number;
  difficulty: QuestionDifficulty;
  topic: string;
  chapterNumber: number | null;
}

const TYPES: QuestionType[] = ["MCQ", "SHORT_ANSWER", "LONG_ANSWER", "NUMERICAL"];
const DIFFICULTIES: QuestionDifficulty[] = ["EASY", "MEDIUM", "HARD"];

/** Reads questions pasted as text, so a teacher can type up a past paper in one go. Blocks are
 * separated by a line holding only "---". Fields are labelled lines: Q, TYPE, OPTIONS (separated
 * by |), ANSWER, EXPLANATION, MARKS, DIFFICULTY, TOPIC and CHAPTER (a chapter number, overriding
 * the one chosen on the form). Returns what it understood and a message for each block it could
 * not read, instead of failing the whole paste. */
export function parseImportText(raw: string): { questions: ImportedQuestion[]; problems: string[] } {
  const questions: ImportedQuestion[] = [];
  const problems: string[] = [];
  const blocks = raw.split(/^\s*---\s*$/m).map((b) => b.trim()).filter(Boolean);

  blocks.forEach((block, index) => {
    const field = (name: string) => block.match(new RegExp(`^${name}:\\s*(.+)$`, "im"))?.[1]?.trim();
    const label = `Question ${index + 1}`;
    const text = field("Q");
    const typeRaw = field("TYPE")?.toUpperCase().replace(/\s+/g, "_");
    if (!text) return void problems.push(`${label}: missing a "Q:" line.`);
    const type = TYPES.find((t) => t === typeRaw);
    if (!type) return void problems.push(`${label}: TYPE must be MCQ, SHORT_ANSWER, LONG_ANSWER or NUMERICAL.`);

    const options = type === "MCQ" ? (field("OPTIONS") ?? "").split("|").map((o) => o.trim()).filter(Boolean) : [];
    const answer = field("ANSWER") ?? "";
    if (type === "MCQ" && options.length < 2) return void problems.push(`${label}: an MCQ needs OPTIONS separated by |.`);
    if (type === "MCQ" && !options.includes(answer)) return void problems.push(`${label}: ANSWER must match one of the options exactly.`);
    if (type === "NUMERICAL" && !answer) return void problems.push(`${label}: a numerical question needs an ANSWER.`);

    const marks = Number(field("MARKS"));
    const difficulty = DIFFICULTIES.find((d) => d === field("DIFFICULTY")?.toUpperCase()) ?? "MEDIUM";
    const chapterNumber = Number(field("CHAPTER"));
    questions.push({
      type,
      questionText: text,
      options,
      correctAnswer: answer,
      explanation: field("EXPLANATION") ?? "",
      marks: Number.isInteger(marks) && marks > 0 ? marks : 1,
      difficulty,
      topic: field("TOPIC") ?? "",
      chapterNumber: Number.isInteger(chapterNumber) && chapterNumber > 0 ? chapterNumber : null,
    });
  });
  return { questions, problems };
}
