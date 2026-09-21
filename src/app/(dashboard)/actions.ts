"use server";

import { revalidatePath } from "next/cache";
import { signOut } from "@/lib/auth";
import { requireSession } from "@/lib/session";
import * as notificationService from "@/lib/services/notifications";

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function markNotificationReadAction(id: string) {
  const session = await requireSession();
  await notificationService.markRead(id, session.user.id);
  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction() {
  const session = await requireSession();
  await notificationService.markAllRead(session.user.id);
  revalidatePath("/", "layout");
}
