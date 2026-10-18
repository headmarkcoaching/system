"use server";

import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { retryRecordingJob, processRecordingJob } from "@/lib/services/zoom-recordings";

/** Puts a failed class recording back in the queue and starts the copy right away. */
export async function retryZoomRecordingAction(jobId: string): Promise<{ error?: string }> {
  await requireRoleSession(["SUPER_ADMIN", "ADMIN"]);
  if (typeof jobId !== "string" || !jobId) return { error: "Unknown recording." };
  const queued = await retryRecordingJob(jobId);
  if (!queued) return { error: "This recording can't be retried." };
  await processRecordingJob(jobId);
  revalidatePath("/admin/system-health");
  return {};
}
