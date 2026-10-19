import type { RoleKey } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { STAFF_ROLES } from "@/lib/permissions";

/**
 * Who may see a student's or parent's phone numbers, email and address.
 *
 * Only the admins (and the student or parent it is about). Teachers never see them: contact with a
 * family goes through the academy's own messages, so a teacher cannot take a student away by calling
 * them directly. The server removes these fields before a teacher's page is built, so they are not
 * merely hidden on screen.
 */
export function canSeeContactDetails(role: RoleKey, relation: "none" | "self" | "family" = "none"): boolean {
  if (STAFF_ROLES.includes(role)) return true;
  return relation === "self" || relation === "family";
}

/** The fields of a student or parent that are contact details. */
export const CONTACT_FIELDS = ["phone", "whatsapp", "email", "address", "city"] as const;

/** A copy of the row with every contact field emptied. */
export function withoutContactDetails<T extends Record<string, unknown>>(row: T): T {
  const copy: Record<string, unknown> = { ...row };
  for (const key of CONTACT_FIELDS) if (key in copy) copy[key] = null;
  return copy as T;
}

/**
 * What to select when a student row is loaded for a page a teacher can open (a batch's roster, homework
 * submissions, test results...). Every field except phone, WhatsApp, email, address, city and date of birth.
 */
export const STUDENT_SAFE_SELECT = {
  id: true,
  studentCode: true,
  userId: true,
  fullName: true,
  photoUrl: true,
  gender: true,
  academicLevelId: true,
  boardId: true,
  groupId: true,
  school: true,
  status: true,
  statusChangedAt: true,
  enrollmentDate: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StudentSelect;
