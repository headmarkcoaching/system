"use server";

import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/permissions";
import * as aiUsageService from "@/lib/services/ai-usage";

export async function updateAIUsageConfigAction(data: { dailyTokenSoftCap: number | null; costPerThousandTokensUsd: number }) {
  const session = await requireRoleSession(STAFF_ROLES);
  await aiUsageService.updateAIUsageConfig(data, session.user.id);
  revalidatePath("/admin/ai-usage");
}
