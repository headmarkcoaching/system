// Pure logic for practice tests: how a book is split into quarters and halves, how a balanced
// paper is picked from the question bank, how answers are checked, and what a student should
// practise next. Nothing here touches the database, so it can be tested on its own.

export interface ChapterLite {
  id: string;
  number: number;
  title: string;
}

export interface ScopeBlock {
  key: string;
  scope: "QUARTER" | "HALF" | "FULL";
  label: string;
  detail: string;
  chapterIds: string[];
}

/** Splits a list into `parts` runs of consecutive items, as even as possible, with any leftover
 * going to the earlier runs (10 chapters into 4 gives 3, 3, 2, 2). */
export function partitionChapters<T>(items: T[], parts: number): T[][] {
  const n = items.length;
  if (n === 0 || parts < 1) return [];
  const count = Math.min(parts, n);
  const base = Math.floor(n / count);
  const extra = n % count;
  const result: T[][] = [];
  let index = 0;
  for (let i = 0; i < count; i++) {
    const size = base + (i < extra ? 1 : 0);
    result.push(items.slice(index, index + size));
    index += size;
  }
  return result;
}

function chapterRange(chapters: ChapterLite[]) {
  if (chapters.length === 1) return `Chapter ${chapters[0].number}`;
  return `Chapters ${chapters[0].number} to ${chapters[chapters.length - 1].number}`;
}

/** Quarters need at least four chapters to mean anything and halves at least two; a one-chapter
 * book has only the chapter itself. */
export function buildScopeBlocks(chapters: ChapterLite[]) {
  const sorted = [...chapters].sort((a, b) => a.number - b.number);
  const quarters: ScopeBlock[] =
    sorted.length >= 4
      ? partitionChapters(sorted, 4).map((c, i) => ({ key: `Q${i + 1}`, scope: "QUARTER" as const, label: `Quarter ${i + 1}`, detail: chapterRange(c), chapterIds: c.map((x) => x.id) }))
      : [];
  const halves: ScopeBlock[] =
    sorted.length >= 2
      ? partitionChapters(sorted, 2).map((c, i) => ({ key: `H${i + 1}`, scope: "HALF" as const, label: i === 0 ? "First half" : "Second half", detail: chapterRange(c), chapterIds: c.map((x) => x.id) }))
      : [];
  const full: ScopeBlock | null =
    sorted.length >= 2 ? { key: "FULL", scope: "FULL", label: "Full book", detail: chapterRange(sorted), chapterIds: sorted.map((c) => c.id) } : null;
  return { chapters: sorted, quarters, halves, full };
}

export const SCOPE_DEFAULT_COUNT = { CHAPTER: 10, QUARTER: 20, HALF: 30, FULL: 40, WEAK_AREAS: 15 } as const;

/** One and a half minutes a mark, never under ten minutes. */
export function suggestedDuration(totalMarks: number) {
  return Math.max(10, Math.round(totalMarks * 1.5));
}

// ---- Seeded shuffle, so a reloaded session always shows the same option order ----

function hashSeed(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], seed: string): T[] {
  const random = hashSeed(seed);
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ---- Choosing a paper ----

export interface PoolQuestion {
  id: string;
  chapterId: string;
  type: string;
  marks: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
}

export interface SelectOptions {
  count: number;
  /** Chapters in book order; also decides the order questions appear in. */
  chapterOrder: string[];
  /** How many times this student has already met each question. */
  seenCounts: Map<string, number>;
  difficulty: "MIXED" | "EASY" | "MEDIUM" | "HARD";
  objectiveOnly: boolean;
  seed: string;
}

/** Picks questions chapter by chapter in turn so every chapter in scope is represented, taking
 * questions the student has seen least first. Falls back to every difficulty when the chosen one
 * has too few questions, rather than returning a short paper. */
export function selectQuestions(pool: PoolQuestion[], options: SelectOptions): PoolQuestion[] {
  const objective = (q: PoolQuestion) => q.type === "MCQ" || q.type === "NUMERICAL";
  let candidates = options.objectiveOnly ? pool.filter(objective) : pool;
  if (options.difficulty !== "MIXED") {
    const narrowed = candidates.filter((q) => q.difficulty === options.difficulty);
    if (narrowed.length >= Math.min(options.count, candidates.length)) candidates = narrowed;
  }

  const byChapter = new Map<string, PoolQuestion[]>();
  for (const id of options.chapterOrder) byChapter.set(id, []);
  for (const q of seededShuffle(candidates, options.seed)) byChapter.get(q.chapterId)?.push(q);
  for (const list of byChapter.values()) {
    // Stable sort keeps the seeded order among questions seen equally often.
    list.sort((a, b) => (options.seenCounts.get(a.id) ?? 0) - (options.seenCounts.get(b.id) ?? 0));
  }

  const picked: PoolQuestion[] = [];
  const cursors = new Map<string, number>();
  let progressed = true;
  while (picked.length < options.count && progressed) {
    progressed = false;
    for (const chapterId of options.chapterOrder) {
      if (picked.length >= options.count) break;
      const list = byChapter.get(chapterId) ?? [];
      const at = cursors.get(chapterId) ?? 0;
      if (at < list.length) {
        picked.push(list[at]);
        cursors.set(chapterId, at + 1);
        progressed = true;
      }
    }
  }

  const rank = new Map(options.chapterOrder.map((id, i) => [id, i]));
  return picked.map((q, i) => ({ q, i })).sort((a, b) => (rank.get(a.q.chapterId) ?? 0) - (rank.get(b.q.chapterId) ?? 0) || a.i - b.i).map((x) => x.q);
}

// ---- Checking answers ----

export function normalizeAnswer(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function toNumber(value: string): number | null {
  const cleaned = value.trim().replace(/,/g, "").replace(/\s+/g, "");
  if (cleaned === "") return null;
  const fraction = cleaned.match(/^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    return denominator === 0 ? null : Number(fraction[1]) / denominator;
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** MCQ answers match the option text; numerical answers match as numbers, so "3", "3.0" and
 * "6/2" are all the same answer. Only objective questions are auto-checked. */
export function answersMatch(type: string, given: string, correct: string | null | undefined): boolean {
  if (!given.trim() || correct == null || correct.trim() === "") return false;
  if (type === "NUMERICAL") {
    const a = toNumber(given);
    const b = toNumber(correct);
    if (a !== null && b !== null) return Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b));
  }
  return normalizeAnswer(given) === normalizeAnswer(correct);
}

export function isObjectiveType(type: string) {
  return type === "MCQ" || type === "NUMERICAL";
}

// ---- Mastery and the next step ----

export type MasteryLevel = "NEW" | "NEEDS_WORK" | "IMPROVING" | "STRONG";

export interface ChapterMastery {
  chapterId: string;
  /** Questions answered in practice. */
  attempted: number;
  /** Share of marks earned on the most recent answers, or null before any practice. */
  percent: number | null;
}

export function masteryLevel(m: Pick<ChapterMastery, "attempted" | "percent">): MasteryLevel {
  if (m.attempted === 0 || m.percent === null) return "NEW";
  if (m.percent < 50) return "NEEDS_WORK";
  if (m.percent < 75 || m.attempted < 5) return "IMPROVING";
  return "STRONG";
}

export interface Recommendation {
  id: string;
  title: string;
  detail: string;
  scope: "CHAPTER" | "QUARTER" | "HALF" | "FULL" | "WEAK_AREAS";
  /** Block key (Q1, H2, FULL) or chapter id, to prefill the start page. */
  target?: string;
}

/** Suggests the next one or two steps up the ladder: repair weak chapters first, then test a
 * whole quarter once every chapter in it is solid, then halves, then the full book. A step the
 * student has already passed (the same scope scored well) is skipped. */
export function recommendNext(input: {
  chapters: ChapterLite[];
  blocks: ReturnType<typeof buildScopeBlocks>;
  mastery: Map<string, ChapterMastery>;
  passedScopeKeys: Set<string>;
  availableByChapter: Map<string, number>;
}): Recommendation[] {
  const { chapters, blocks, mastery, passedScopeKeys, availableByChapter } = input;
  const levelOf = (id: string) => masteryLevel(mastery.get(id) ?? { attempted: 0, percent: null });
  const recs: Recommendation[] = [];

  const weak = chapters.filter((c) => levelOf(c.id) === "NEEDS_WORK" && (availableByChapter.get(c.id) ?? 0) > 0);
  if (weak.length > 0) {
    recs.push({
      id: "weak",
      title: "Fix your weak chapters first",
      detail: `${weak.map((c) => `Chapter ${c.number}`).slice(0, 3).join(", ")} ${weak.length === 1 ? "is" : "are"} under 50%. A short targeted paper will help most.`,
      scope: "WEAK_AREAS",
    });
  }

  const solid = (ids: string[]) => ids.length > 0 && ids.every((id) => ["IMPROVING", "STRONG"].includes(levelOf(id)) && (mastery.get(id)?.percent ?? 0) >= 60);
  const ladder = [...blocks.quarters, ...blocks.halves, ...(blocks.full ? [blocks.full] : [])];
  for (const block of ladder) {
    if (recs.length >= 2) break;
    if (passedScopeKeys.has(block.key)) continue;
    if (!solid(block.chapterIds)) continue;
    recs.push({
      id: `ready-${block.key}`,
      title: `You're ready for the ${block.label.toLowerCase()} test`,
      detail: `Every chapter in ${block.detail.toLowerCase()} is at 60% or better. Test them together as an exam.`,
      scope: block.scope,
      target: block.key,
    });
  }

  if (recs.length < 2) {
    const fresh = chapters.find((c) => levelOf(c.id) === "NEW" && (availableByChapter.get(c.id) ?? 0) > 0);
    if (fresh) {
      recs.push({
        id: `start-${fresh.id}`,
        title: `Start with Chapter ${fresh.number}`,
        detail: `${fresh.title} has questions ready and you haven't practised it yet.`,
        scope: "CHAPTER",
        target: fresh.id,
      });
    }
  }
  return recs.slice(0, 2);
}
