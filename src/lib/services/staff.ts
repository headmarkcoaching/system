import "server-only";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import type { RoleKey } from "@prisma/client";

export function listTeachers() {
  return db.teacher.findMany({
    include: { batchAssignments: { include: { batch: true } }, user: true },
    orderBy: { fullName: "asc" },
  });
}

export function listTeachersForPicker() {
  return db.teacher.findMany({ orderBy: { fullName: "asc" }, select: { id: true, fullName: true } });
}

/** Admin/Super Admin/Teacher users — who can be assigned responsibility for an Intervention. */
export function listStaffForPicker() {
  return db.user.findMany({
    where: { roleKey: { in: ["SUPER_ADMIN", "ADMIN", "TEACHER"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

/** Admin/Super Admin users — recipients for academy-wide staff notifications like new support tickets,
 * and the assignment picker for support ticket triage. */
export function listAdmins() {
  return db.user.findMany({ where: { roleKey: { in: ["SUPER_ADMIN", "ADMIN"] } }, orderBy: { name: "asc" }, select: { id: true, name: true } });
}

export async function listAdminUserIds() {
  const admins = await listAdmins();
  return admins.map((u) => u.id);
}

export function getTeacherById(id: string) {
  return db.teacher.findUnique({
    where: { id },
    include: { user: true, batchAssignments: { include: { batch: true, subject: true } } },
  });
}

export async function getTeacherByUserId(userId: string) {
  return db.teacher.findUnique({ where: { userId } });
}

export interface UpdateTeacherProfileInput {
  bio?: string;
  qualification?: string;
  experienceYears?: number;
  specialization?: string;
}

export function updateTeacherProfile(id: string, data: UpdateTeacherProfileInput) {
  return db.teacher.update({
    where: { id },
    data: {
      bio: data.bio || null,
      qualification: data.qualification || null,
      experienceYears: data.experienceYears ?? null,
      specialization: data.specialization || null,
    },
  });
}

export function updateTeacherPhoto(id: string, photoUrl: string) {
  return db.teacher.update({ where: { id }, data: { photoUrl } });
}

export function listCounselors() {
  return db.counselor.findMany({ include: { user: true }, orderBy: { fullName: "asc" } });
}

export interface CreateUserInput {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  role: RoleKey;
}

export async function createStaffUser(input: CreateUserInput) {
  const role = await db.role.findUniqueOrThrow({ where: { key: input.role } });
  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await db.user.create({
    data: {
      name: input.name,
      email: input.email || undefined,
      phone: input.phone || undefined,
      passwordHash,
      roleId: role.id,
      roleKey: input.role,
    },
  });

  if (input.role === "TEACHER") {
    await db.teacher.create({ data: { userId: user.id, fullName: input.name, email: input.email, phone: input.phone } });
  } else if (input.role === "COUNSELOR") {
    await db.counselor.create({ data: { userId: user.id, fullName: input.name, email: input.email, phone: input.phone } });
  }

  return user;
}

export function listUsers() {
  return db.user.findMany({ include: { role: true }, orderBy: { createdAt: "desc" } });
}

export async function setUserActive(id: string, isActive: boolean) {
  return db.user.update({ where: { id }, data: { isActive } });
}

export function listRolesWithPermissions() {
  return db.role.findMany({
    include: { rolePermissions: { include: { permission: true } } },
    orderBy: { name: "asc" },
  });
}
