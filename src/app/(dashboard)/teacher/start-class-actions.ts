"use server";

import { requireRoleSession } from "@/lib/session";
import { ACADEMIC_STAFF_ROLES } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { getTeacherStartUrl, StartClassError } from "@/lib/services/zoom-join";

// Returns the host link for starting a Zoom class. It is fetched fresh at the moment of starting and is
// only handed to the class's own teacher (or staff); a teacher never sees the Zoom account's login.
export async function startZoomClassAction(liveClassId: string): Promise<{ url?: string; error?: string }> {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  try {
    const url = await getTeacherStartUrl({ id: session.user.id, role: session.user.role }, liveClassId);
    revalidatePath("/teacher");
    return { url };
  } catch (err) {
    if (err instanceof StartClassError) return { error: err.message };
    console.error("startZoomClassAction failed", err);
    return { error: "Couldn't start the class right now. Please try again in a moment." };
  }
}
