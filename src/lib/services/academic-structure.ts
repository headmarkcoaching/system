import "server-only";
import { db } from "@/lib/db";
import type { GroupType } from "@prisma/client";

export function listAcademicLevels() {
  return db.academicLevel.findMany({ orderBy: { sortOrder: "asc" } });
}

export function createAcademicLevel(data: { name: string; sortOrder: number }) {
  return db.academicLevel.create({ data });
}

export function updateAcademicLevel(id: string, data: { name?: string; sortOrder?: number; isActive?: boolean }) {
  return db.academicLevel.update({ where: { id }, data });
}

export function listBoards() {
  return db.board.findMany({ orderBy: { name: "asc" } });
}

export function createBoard(data: { name: string }) {
  return db.board.create({ data });
}

export function updateBoard(id: string, data: { name?: string; isActive?: boolean }) {
  return db.board.update({ where: { id }, data });
}

export function listPrograms() {
  return db.program.findMany({ orderBy: { name: "asc" } });
}

export function createProgram(data: { name: string; description?: string }) {
  return db.program.create({ data });
}

export function updateProgram(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
  return db.program.update({ where: { id }, data });
}

/** Blocks the delete with a clear message instead of letting a raw foreign-key error surface —
 * a Program still assigned to a batch or referenced by an enrollment can't be removed at the DB
 * level anyway (no onDelete: Cascade/SetNull on either relation), so check first. */
export async function deleteProgram(id: string) {
  const [batchCount, enrollmentCount] = await Promise.all([
    db.batch.count({ where: { programId: id } }),
    db.enrollment.count({ where: { programId: id } }),
  ]);
  if (batchCount > 0 || enrollmentCount > 0) {
    const parts = [];
    if (batchCount > 0) parts.push(`${batchCount} batch${batchCount === 1 ? "" : "es"}`);
    if (enrollmentCount > 0) parts.push(`${enrollmentCount} enrollment${enrollmentCount === 1 ? "" : "s"}`);
    throw new Error(`Can't delete — still assigned to ${parts.join(" and ")}. Reassign or remove those first, or mark it Inactive instead.`);
  }
  return db.program.delete({ where: { id } });
}

export function listGroups() {
  return db.group.findMany({ orderBy: { name: "asc" } });
}

export function createGroup(data: { name: string; type: GroupType }) {
  return db.group.create({ data });
}

export function updateGroup(id: string, data: { name?: string; type?: GroupType; isActive?: boolean }) {
  return db.group.update({ where: { id }, data });
}

export function listSubjects() {
  return db.subject.findMany({ orderBy: { name: "asc" }, include: { academicLevel: true } });
}

export function createSubject(data: { name: string; academicLevelId?: string | null }) {
  return db.subject.create({ data });
}

export function updateSubject(id: string, data: { name?: string; academicLevelId?: string | null; isActive?: boolean }) {
  return db.subject.update({ where: { id }, data });
}
