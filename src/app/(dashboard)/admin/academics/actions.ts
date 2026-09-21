"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as academicService from "@/lib/services/academic-structure";
import type { GroupType } from "@prisma/client";

const PATH = "/admin/academics";

function actionError(message: string) {
  return { error: message };
}

// ---- Academic Levels ----

const levelSchema = z.object({
  name: z.string().min(2, "Name is required"),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().optional(),
});

export async function createAcademicLevelAction(data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = levelSchema.safeParse(data);
  if (!parsed.success) return actionError(parsed.error.issues[0].message);

  const record = await academicService.createAcademicLevel(parsed.data);
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "AcademicLevel", entityId: record.id, after: record });
  revalidatePath(PATH);
}

export async function updateAcademicLevelAction(id: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = levelSchema.partial().safeParse(data);
  if (!parsed.success) return actionError(parsed.error.issues[0].message);

  const record = await academicService.updateAcademicLevel(id, parsed.data);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "AcademicLevel", entityId: id, after: record });
  revalidatePath(PATH);
}

// ---- Boards ----

const boardSchema = z.object({
  name: z.string().min(2, "Name is required"),
  isActive: z.boolean().optional(),
});

export async function createBoardAction(data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = boardSchema.safeParse(data);
  if (!parsed.success) return actionError(parsed.error.issues[0].message);

  const record = await academicService.createBoard(parsed.data);
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "Board", entityId: record.id, after: record });
  revalidatePath(PATH);
}

export async function updateBoardAction(id: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = boardSchema.partial().safeParse(data);
  if (!parsed.success) return actionError(parsed.error.issues[0].message);

  const record = await academicService.updateBoard(id, parsed.data);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "Board", entityId: id, after: record });
  revalidatePath(PATH);
}

// ---- Programs ----

const programSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function createProgramAction(data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = programSchema.safeParse(data);
  if (!parsed.success) return actionError(parsed.error.issues[0].message);

  const record = await academicService.createProgram(parsed.data);
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "Program", entityId: record.id, after: record });
  revalidatePath(PATH);
}

export async function updateProgramAction(id: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = programSchema.partial().safeParse(data);
  if (!parsed.success) return actionError(parsed.error.issues[0].message);

  const record = await academicService.updateProgram(id, parsed.data);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "Program", entityId: id, after: record });
  revalidatePath(PATH);
}

export async function deleteProgramAction(id: string) {
  const session = await requireRoleSession(STAFF_ROLES);
  // Thrown Server Action errors get redacted to a generic message in production — the "still
  // assigned to N batches" reason only reaches the user if we catch it and return it instead.
  try {
    await academicService.deleteProgram(id);
  } catch (err) {
    return actionError(err instanceof Error ? err.message : "Could not delete this program.");
  }
  await logAudit({ actorId: session.user.id, action: "DELETE", entityType: "Program", entityId: id });
  revalidatePath(PATH);
}

// ---- Groups ----

const GROUP_TYPES = ["PRE_MEDICAL", "PRE_ENGINEERING", "ICS", "ICOM", "FA", "OTHER"] as const;

const groupSchema = z.object({
  name: z.string().min(2, "Name is required"),
  type: z.enum(GROUP_TYPES),
  isActive: z.boolean().optional(),
});

export async function createGroupAction(data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = groupSchema.safeParse(data);
  if (!parsed.success) return actionError(parsed.error.issues[0].message);

  const record = await academicService.createGroup(parsed.data as { name: string; type: GroupType });
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "Group", entityId: record.id, after: record });
  revalidatePath(PATH);
}

export async function updateGroupAction(id: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = groupSchema.partial().safeParse(data);
  if (!parsed.success) return actionError(parsed.error.issues[0].message);

  const record = await academicService.updateGroup(id, parsed.data as { name?: string; type?: GroupType; isActive?: boolean });
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "Group", entityId: id, after: record });
  revalidatePath(PATH);
}

// ---- Subjects ----

const subjectSchema = z.object({
  name: z.string().min(2, "Name is required"),
  academicLevelId: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function createSubjectAction(data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = subjectSchema.safeParse(data);
  if (!parsed.success) return actionError(parsed.error.issues[0].message);

  const record = await academicService.createSubject({
    name: parsed.data.name,
    academicLevelId: parsed.data.academicLevelId || null,
  });
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "Subject", entityId: record.id, after: record });
  revalidatePath(PATH);
}

export async function updateSubjectAction(id: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = subjectSchema.partial().safeParse(data);
  if (!parsed.success) return actionError(parsed.error.issues[0].message);

  const record = await academicService.updateSubject(id, {
    ...parsed.data,
    academicLevelId: parsed.data.academicLevelId || null,
  });
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "Subject", entityId: id, after: record });
  revalidatePath(PATH);
}
