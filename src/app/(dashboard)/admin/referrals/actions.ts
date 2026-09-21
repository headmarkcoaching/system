"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as referralsService from "@/lib/services/referrals";

const rewardSchema = z.object({
  rewardType: z.enum(["DISCOUNT", "FREE_MONTH", "BONUS_CLASS", "POINTS", "OTHER"]),
  description: z.string().optional(),
  value: z.coerce.number().optional(),
});

export async function grantReferralRewardAction(referralId: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = rewardSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const reward = await referralsService.grantReward(referralId, parsed.data.rewardType, parsed.data.description, parsed.data.value, session.user.id);
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "ReferralReward", entityId: reward.id, after: reward });
  revalidatePath("/admin/referrals");
}
