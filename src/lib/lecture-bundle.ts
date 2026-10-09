// Chapter is free text on recordings, study material, homework and tests, so the match has to
// forgive the usual differences between two staff members typing the same chapter name.
export function normalizeChapter(chapter: string | null | undefined): string {
  return (chapter ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function chapterMatches(itemChapter: string | null | undefined, wanted: string | null | undefined): boolean {
  const target = normalizeChapter(wanted);
  return target !== "" && normalizeChapter(itemChapter) === target;
}

export interface LectureBundle {
  chapter: string;
  notes: number;
  practice: number;
  tests: number;
}

interface Tagged {
  subjectId: string;
  chapter: string | null;
}

export function buildBundleLookup(sources: { materials: Tagged[]; homework: Tagged[]; tests: Tagged[] }) {
  const counts = new Map<string, { notes: number; practice: number; tests: number }>();
  const bump = (items: Tagged[], key: "notes" | "practice" | "tests") => {
    for (const item of items) {
      const chapter = normalizeChapter(item.chapter);
      if (!chapter) continue;
      const k = `${item.subjectId}::${chapter}`;
      const entry = counts.get(k) ?? { notes: 0, practice: 0, tests: 0 };
      entry[key] += 1;
      counts.set(k, entry);
    }
  };
  bump(sources.materials, "notes");
  bump(sources.homework, "practice");
  bump(sources.tests, "tests");

  return (subjectId: string, chapter: string | null | undefined): LectureBundle | null => {
    const label = (chapter ?? "").trim();
    if (!label) return null;
    const entry = counts.get(`${subjectId}::${normalizeChapter(label)}`);
    if (!entry || entry.notes + entry.practice + entry.tests === 0) return null;
    return { chapter: label, ...entry };
  };
}
