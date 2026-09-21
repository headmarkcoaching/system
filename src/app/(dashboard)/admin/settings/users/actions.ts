"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { SUPER_ADMIN_ONLY, STAFF_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as staffService from "@/lib/services/staff";

const createUserSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "TEACHER", "COUNSELOR"]),
});

export interface CreateUserState {
  error?: string;
}

export async function createUserAction(_prevState: CreateUserState, formData: FormData): Promise<CreateUserState> {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = createUserSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (parsed.data.role === "SUPER_ADMIN" && !SUPER_ADMIN_ONLY.includes(session.user.role)) {
    return { error: "Only a Super Admin can create another Super Admin." };
  }
  if (!parsed.data.email && !parsed.data.phone) {
    return { error: "Provide an email or phone number for login." };
  }

  try {
    const user = await staffService.createStaffUser(parsed.data);
    await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "User", entityId: user.id, after: { name: user.name, role: user.roleKey } });
  } catch {
    return { error: "A user with that email or phone already exists." };
  }

  revalidatePath("/admin/settings/users");
  revalidatePath("/admin/teachers");
  return {};
}

export async function setUserActiveAction(id: string, isActive: boolean) {
  const session = await requireRoleSession(STAFF_ROLES);
  const record = await staffService.setUserActive(id, isActive);
  await logAudit({ actorId: session.user.id, action: "STATUS_CHANGE", entityType: "User", entityId: id, after: record });
  revalidatePath("/admin/settings/users");
}
