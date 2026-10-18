import "server-only";
import { runDueRecordingJobs } from "@/lib/services/zoom-recordings";

/** Retries any finished Zoom recording that hasn't reached Google Drive yet (see services/zoom-recordings). */
export async function runZoomRecordingJobs() {
  const { processed } = await runDueRecordingJobs();
  return { processed };
}
