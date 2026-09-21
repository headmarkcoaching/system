"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRoleSession } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as parentService from "@/lib/services/parents";

const createParentSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  phone: z.string().min(6, "Phone number is required"),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  city: z.string().optional(),
  createLogin: z.coerce.boolean().optional(),
  loginPassword: z.string().optional(),
});

export interface CreateParentState {
  error?: string;
}

export async function createParentAction(_prevState: CreateParentState, formData: FormData): Promise<CreateParentState> {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = createParentSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (parsed.data.createLogin && (!parsed.data.loginPassword || parsed.data.loginPassword.length < 6)) {
    return { error: "Set a login password of at least 6 characters, or turn off 'Create login'." };
  }

  const parent = await parentService.createParent(parsed.data);
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "Parent", entityId: parent.id, after: parent });

  revalidatePath("/admin/parents");
  redirect(`/parents/${parent.id}`);
}

const updateParentSchema = createParentSchema.omit({ createLogin: true, loginPassword: true }).partial();

export async function updateParentAction(id: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = updateParentSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const record = await parentService.updateParent(id, parsed.data);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "Parent", entityId: id, after: record });

  revalidatePath(`/parents/${id}`);
  revalidatePath("/admin/parents");
}
