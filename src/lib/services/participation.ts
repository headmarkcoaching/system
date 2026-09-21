import "server-only";
import { db } from "@/lib/db";
import { onParticipationRecorded } from "@/lib/services/gamification";

export interface RecordParticipationInput {
  studentId: string;
  batchId: string;
  periodStart: string;
  periodEnd: string;
  score: number;
  note?: string;
  recordedById: string;
}

export async function recordParticipationScore(input: RecordParticipationInput) {
  const record = await db.participationScore.create({
    data: {
      ...input,
      periodStart: new Date(input.periodStart),
      periodEnd: new Date(input.periodEnd),
    },
  });

  try {
    await onParticipationRecorded(input.studentId, record.id);
  } catch (err) {
    console.error("onParticipationRecorded failed", err);
  }

  return record;
}

export function listParticipationForBatch(batchId: string) {
  return db.participationScore.findMany({
    where: { batchId },
    include: { student: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export function listParticipationForStudent(studentId: string) {
  return db.participationScore.findMany({
    where: { studentId },
    orderBy: { periodEnd: "desc" },
  });
}

export async function getLatestParticipationScore(studentId: string) {
  const latest = await db.participationScore.findFirst({
    where: { studentId },
    orderBy: { periodEnd: "desc" },
  });
  return latest?.score ?? null;
}
