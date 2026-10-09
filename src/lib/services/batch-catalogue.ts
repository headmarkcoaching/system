import "server-only";
import { db } from "@/lib/db";
import type { DayOfWeek } from "@prisma/client";

const DAY_ORDER: DayOfWeek[] = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
const DAY_SHORT: Record<DayOfWeek, string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};

export interface CatalogueBatch {
  id: string;
  name: string;
  levelId: string;
  levelName: string;
  boardName: string | null;
  groupName: string | null;
  startDate: Date;
  isUpcoming: boolean;
  subjects: { id: string; name: string }[];
  seatsLeft: number;
  schedule: string | null;
}

/** "Mon–Sat" when the days are consecutive, otherwise "Mon, Wed, Fri". */
function describeDays(days: DayOfWeek[]) {
  const sorted = Array.from(new Set(days)).sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  if (sorted.length === 0) return "";
  const idx = sorted.map((d) => DAY_ORDER.indexOf(d));
  const consecutive = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  if (sorted.length >= 3 && consecutive) return `${DAY_SHORT[sorted[0]]}–${DAY_SHORT[sorted[sorted.length - 1]]}`;
  return sorted.map((d) => DAY_SHORT[d]).join(", ");
}

function to12h(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

const batchInclude = {
  academicLevel: true,
  board: true,
  group: true,
  subjects: { include: { subject: true } },
  timetableEntries: { where: { isActive: true }, select: { dayOfWeek: true, startTime: true } },
  _count: { select: { students: true } },
} as const;

type BatchRow = Awaited<ReturnType<typeof loadBatches>>[number];

function loadBatches(where: { id?: string }) {
  return db.batch.findMany({
    where: { ...where, status: { in: ["UPCOMING", "ACTIVE"] }, academicLevel: { isActive: true } },
    include: batchInclude,
    orderBy: [{ academicLevel: { sortOrder: "asc" } }, { name: "asc" }],
  });
}

function toCatalogueBatch(b: BatchRow): CatalogueBatch {
  const days = b.timetableEntries.map((t) => t.dayOfWeek);
  // The earliest class start of the day stands in for "class time"; per-subject times can
  // differ, so show only the days plus the first slot rather than implying one fixed hour.
  const firstStart = b.timetableEntries.map((t) => t.startTime).sort()[0];
  const schedule = days.length ? `${describeDays(days)}${firstStart ? ` · from ${to12h(firstStart)}` : ""}` : null;

  return {
    id: b.id,
    name: b.name,
    levelId: b.academicLevelId,
    levelName: b.academicLevel.name,
    boardName: b.board?.name ?? null,
    groupName: b.group?.name ?? null,
    startDate: b.startDate,
    isUpcoming: b.startDate > new Date(),
    subjects: b.subjects.map((s) => ({ id: s.subject.id, name: s.subject.name })).sort((a, c) => a.name.localeCompare(c.name)),
    seatsLeft: Math.max(0, b.maxStudents - b._count.students),
    schedule,
  };
}

export async function listOpenBatches(): Promise<CatalogueBatch[]> {
  return (await loadBatches({})).map(toCatalogueBatch);
}

export async function getOpenBatch(id: string): Promise<(CatalogueBatch & { boardId: string | null; groupId: string | null }) | null> {
  const [row] = await loadBatches({ id });
  if (!row) return null;
  return { ...toCatalogueBatch(row), boardId: row.boardId, groupId: row.groupId };
}
