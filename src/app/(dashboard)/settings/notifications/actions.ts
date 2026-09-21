"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import * as commPrefsService from "@/lib/services/communication-preferences";

const schema = z.object({
  whatsappEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  smsEnabled: z.boolean(),
});

export async function updateNotificationPreferencesAction(data: Record<string, unknown>) {
  const session = await auth();
  if (!session?.user) return { error: "Not signed in." };

  const parsed = schema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await commPrefsService.updatePreference(session.user.id, parsed.data);
  revalidatePath("/settings/notifications");
}
