import "server-only";
import { zoomFetch, getZoomCredentials, getZoomAccessToken, ZoomApiError } from "@/lib/zoom/client";

/** Zoom only ever serves recordings from its own hosts; anything else in a payload is refused. */
export function isZoomDownloadUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "zoom.us" || url.hostname.endsWith(".zoom.us"));
  } catch {
    return false;
  }
}

/**
 * Opens one recording file for streaming. Zoom's webhook includes a one-day download token; once that
 * has lapsed (a retry the next day), the account's own API access is used instead. The response body is
 * piped straight to Google Drive by the caller, so the video never touches a disk.
 */
export async function openZoomRecordingDownload(downloadUrl: string, downloadToken: string | null): Promise<Response> {
  if (!isZoomDownloadUrl(downloadUrl)) throw new ZoomApiError("That recording address isn't a Zoom address, so it was not downloaded.", 400);

  const attempts: string[] = [];
  if (downloadToken) attempts.push(downloadToken);
  const credentials = await getZoomCredentials();
  if (credentials) attempts.push(await getZoomAccessToken(credentials));
  if (attempts.length === 0) throw new ZoomApiError("Zoom isn't connected, so the recording can't be downloaded.", 400);

  let lastStatus = 0;
  for (const token of attempts) {
    const res = await fetch(downloadUrl, { headers: { Authorization: `Bearer ${token}` }, redirect: "follow" });
    if (res.ok && res.body) return res;
    lastStatus = res.status;
    await res.body?.cancel().catch(() => {});
  }
  throw new ZoomApiError(`Zoom would not hand over the recording (HTTP ${lastStatus}). It may still be processing.`, lastStatus);
}

/** Zoom meeting ids that start with "/" or contain "//" must be URL-encoded twice. */
function encodeUuid(uuid: string) {
  return uuid.startsWith("/") || uuid.includes("//") ? encodeURIComponent(encodeURIComponent(uuid)) : encodeURIComponent(uuid);
}

/** Permanently removes a meeting's cloud recordings from Zoom (frees the 10 GB of storage). Already gone is fine. */
export async function deleteZoomMeetingRecordings(meetingUuid: string): Promise<void> {
  try {
    await zoomFetch(`/meetings/${encodeUuid(meetingUuid)}/recordings`, { method: "DELETE", query: { action: "delete" } });
  } catch (err) {
    if (err instanceof ZoomApiError && (err.status === 404 || err.code === 3301)) return;
    throw err;
  }
}
