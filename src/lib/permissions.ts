import type { RoleKey } from "@prisma/client";

export const ROLE_LABELS: Record<RoleKey, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin / Operations",
  TEACHER: "Teacher",
  STUDENT: "Student",
  PARENT: "Parent",
  COUNSELOR: "Admission Counselor",
};

export const ROLE_HOME_PATH: Record<RoleKey, string> = {
  SUPER_ADMIN: "/admin",
  ADMIN: "/admin",
  TEACHER: "/teacher",
  STUDENT: "/student",
  PARENT: "/parent",
  COUNSELOR: "/counselor",
};

export const STAFF_ROLES: RoleKey[] = ["SUPER_ADMIN", "ADMIN"];
export const ACADEMIC_STAFF_ROLES: RoleKey[] = ["SUPER_ADMIN", "ADMIN", "TEACHER"];
export const SUPER_ADMIN_ONLY: RoleKey[] = ["SUPER_ADMIN"];
// Teachers upload Knowledge Base notes; only these three roles can approve/reject one —
// a teacher (even the one who uploaded it) never reviews their own or anyone else's note.
export const KNOWLEDGE_BASE_REVIEWER_ROLES: RoleKey[] = ["SUPER_ADMIN", "ADMIN", "COUNSELOR"];
// Who can open the Knowledge Base at all: teachers (to upload/see their own classes' notes)
// plus everyone who can review (staff already in ACADEMIC_STAFF_ROLES, plus Counselor).
export const KNOWLEDGE_BASE_ACCESS_ROLES: RoleKey[] = ["SUPER_ADMIN", "ADMIN", "TEACHER", "COUNSELOR"];

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function hasAnyRole(userRole: RoleKey, allowed: RoleKey[]): boolean {
  return allowed.includes(userRole);
}

export function assertRole(userRole: RoleKey, allowed: RoleKey[]) {
  if (!hasAnyRole(userRole, allowed)) {
    throw new ForbiddenError();
  }
}
