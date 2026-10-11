/**
 * Loads written question content into the Question Bank from the text files in
 * prisma/question-content. One file per class and subject. Safe to run more than once: chapters
 * are matched by number, questions by their text within a chapter, and nothing is deleted.
 *
 *   npx tsx prisma/load-question-content.ts --dry            check every file, write nothing
 *   npx tsx prisma/load-question-content.ts                  load every file
 *   npx tsx prisma/load-question-content.ts class9-physics   load files whose name contains this
 *
 * File format (one line per question, fields separated by |):
 *   @level Class 9
 *   @subject Physics
 *   # 1 Physical Quantities and Measurement          starts a chapter: number, then title
 *   M|question|option 1|option 2|option 3|option 4|number of the right option (1-4)|explanation|E, M or H
 *   N|question|answer|explanation|E, M or H|optional arithmetic that must equal the answer
 *   S|question|model answer|explanation|E, M or H     written answer, worth 2 marks, self-marked
 * Lines starting with // are comments. Questions are stored as approved AI drafts: they reach
 * students straight away and show as "AI draft" in the Question Bank so teachers can review them.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { answersMatch } from "../src/lib/practice";

const db = new PrismaClient();
const DIR = join(__dirname, "question-content");
const TARGET_PER_CHAPTER = 50;
const DIFF = { E: "EASY", M: "MEDIUM", H: "HARD" } as const;

interface ParsedQuestion {
  type: "MCQ" | "NUMERICAL" | "SHORT_ANSWER";
  text: string;
  options?: string[];
  answer: string;
  explanation: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  marks: number;
}
interface ParsedFile {
  file: string;
  level: string;
  subject: string;
  chapters: { number: number; title: string; questions: ParsedQuestion[] }[];
}

function evaluate(expr: string): number | null {
  if (!/^[0-9+\-*/().,\s^eE]*(Math\.[a-z0-9]+\([^)]*\)[0-9+\-*/().,\s^eE]*)*$/.test(expr)) return null;
  try {
    const value = Function(`"use strict"; return (${expr.replace(/\^/g, "**")});`)();
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function decimalPlaces(value: string) {
  const m = value.trim().match(/\.(\d+)$/);
  return m ? m[1].length : 0;
}

function parseFile(file: string, errors: string[]): ParsedFile {
  const lines = readFileSync(join(DIR, file), "utf8").split(/\r?\n/);
  const parsed: ParsedFile = { file, level: "", subject: "", chapters: [] };
  let current: ParsedFile["chapters"][number] | null = null;
  const seen = new Set<string>();

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("//")) return;
    const where = `${file}:${i + 1}`;
    if (line.startsWith("@level ")) return void (parsed.level = line.slice(7).trim());
    if (line.startsWith("@subject ")) return void (parsed.subject = line.slice(9).trim());
    const heading = line.match(/^#\s+(\d+)\s+(.+)$/);
    if (heading) {
      current = { number: Number(heading[1]), title: heading[2].trim(), questions: [] };
      parsed.chapters.push(current);
      return;
    }
    if (!current) return void errors.push(`${where}: question before any chapter heading`);

    const f = line.split("|").map((s) => s.trim());
    const kind = f[0];
    const bad = (msg: string) => errors.push(`${where}: ${msg}`);
    let q: ParsedQuestion | null = null;

    if (kind === "M") {
      if (f.length !== 9) return bad(`MCQ needs 9 fields, found ${f.length}`);
      const [, text, o1, o2, o3, o4, idx, explanation, d] = f;
      const options = [o1, o2, o3, o4];
      const n = Number(idx);
      if (!Number.isInteger(n) || n < 1 || n > 4) return bad("right option must be 1 to 4");
      if (new Set(options.map((o) => o.toLowerCase())).size !== 4 || options.some((o) => !o)) return bad("options must be four different, non-empty values");
      if (!(d in DIFF)) return bad("difficulty must be E, M or H");
      q = { type: "MCQ", text, options, answer: options[n - 1], explanation, difficulty: DIFF[d as keyof typeof DIFF], marks: 1 };
    } else if (kind === "N") {
      if (f.length !== 5 && f.length !== 6) return bad(`numerical needs 5 or 6 fields, found ${f.length}`);
      const [, text, answer, explanation, d, expr] = f;
      if (!/^-?\d+(\.\d+)?(\/\d+(\.\d+)?)?$/.test(answer.replace(/,/g, "")) || !answersMatch("NUMERICAL", answer, answer)) return bad(`answer "${answer}" is not a plain number`);
      if (!(d in DIFF)) return bad("difficulty must be E, M or H");
      if (expr) {
        const value = evaluate(expr);
        if (value === null) return bad(`could not evaluate check expression "${expr}"`);
        const expected = answer.includes("/") ? Number(answer.split("/")[0]) / Number(answer.split("/")[1]) : Number(answer.replace(/,/g, ""));
        const tolerance = 0.5 * Math.pow(10, -decimalPlaces(answer)) + 1e-9;
        if (Math.abs(value - expected) > tolerance) return bad(`CHECK FAILED: "${expr}" = ${value}, but the answer says ${answer}`);
      }
      q = { type: "NUMERICAL", text, answer, explanation, difficulty: DIFF[d as keyof typeof DIFF], marks: 1 };
    } else if (kind === "S") {
      if (f.length !== 5) return bad(`short answer needs 5 fields, found ${f.length}`);
      const [, text, answer, explanation, d] = f;
      if (!(d in DIFF)) return bad("difficulty must be E, M or H");
      q = { type: "SHORT_ANSWER", text, answer, explanation, difficulty: DIFF[d as keyof typeof DIFF], marks: 2 };
    } else {
      return bad(`unknown line type "${kind}"`);
    }

    if (q.text.length < 5 || !q.answer || !q.explanation) return bad("question, answer and explanation must all be filled in");
    const key = `${parsed.level}|${parsed.subject}|${current.number}|${q.text.toLowerCase()}`;
    if (seen.has(key)) return bad("duplicate question in this chapter");
    seen.add(key);
    current.questions.push(q);
  });

  if (!parsed.level || !parsed.subject) errors.push(`${file}: missing @level or @subject`);
  return parsed;
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry");
  const filters = args.filter((a) => !a.startsWith("--"));
  const files = readdirSync(DIR)
    .filter((f) => f.endsWith(".txt"))
    .filter((f) => filters.length === 0 || filters.some((x) => f.includes(x)))
    .sort();
  if (files.length === 0) throw new Error("No question files matched.");

  const errors: string[] = [];
  const parsedFiles = files.map((f) => parseFile(f, errors));

  for (const p of parsedFiles) {
    const counts = p.chapters.map((c) => `${c.number}:${c.questions.length}`).join(" ");
    const total = p.chapters.reduce((s, c) => s + c.questions.length, 0);
    console.log(`${p.file}: ${p.chapters.length} chapters, ${total} questions   [${counts}]`);
    for (const c of p.chapters) if (c.questions.length < TARGET_PER_CHAPTER) console.log(`  note: chapter ${c.number} has ${c.questions.length} of ${TARGET_PER_CHAPTER}`);
  }
  if (errors.length) {
    console.error(`\n${errors.length} problem(s):\n` + errors.slice(0, 60).join("\n"));
    process.exit(1);
  }
  if (dry) return console.log("\nDry run: everything is valid, nothing written.");

  let chaptersMade = 0;
  let questionsMade = 0;
  for (const p of parsedFiles) {
    const level = await db.academicLevel.findFirst({ where: { name: p.level } });
    const subject = await db.subject.findFirst({ where: { name: p.subject } });
    if (!level || !subject) throw new Error(`${p.file}: unknown level "${p.level}" or subject "${p.subject}"`);
    for (const c of p.chapters) {
      let chapter = await db.chapter.findFirst({ where: { subjectId: subject.id, academicLevelId: level.id, boardId: null, number: c.number } });
      if (!chapter) {
        chapter = await db.chapter.create({ data: { subjectId: subject.id, academicLevelId: level.id, boardId: null, number: c.number, title: c.title } });
        chaptersMade++;
      } else if (chapter.title !== c.title) {
        chapter = await db.chapter.update({ where: { id: chapter.id }, data: { title: c.title } });
      }
      const existing = new Set((await db.bankQuestion.findMany({ where: { chapterId: chapter.id }, select: { questionText: true } })).map((e) => e.questionText));
      const fresh = c.questions.filter((q) => !existing.has(q.text));
      if (fresh.length === 0) continue;
      await db.bankQuestion.createMany({
        data: fresh.map((q) => ({
          subjectId: subject.id,
          academicLevelId: level.id,
          boardId: null,
          chapterId: chapter!.id,
          type: q.type,
          questionText: q.text,
          options: q.options,
          correctAnswer: q.answer,
          explanation: q.explanation,
          marks: q.marks,
          difficulty: q.difficulty,
          source: "AI_DRAFT" as const,
          status: "APPROVED" as const,
        })),
      });
      questionsMade += fresh.length;
    }
  }
  console.log(`\nChapters added: ${chaptersMade}. Questions added: ${questionsMade}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
