import "server-only";
import { zoomFetch, getZoomCredentials, ZoomApiError } from "@/lib/zoom/client";

/**
 * The Zoom calls a live class needs. Every class is a private, scheduled, registration-only meeting:
 *  - registration with automatic approval, so the server can register each PAID student and get that
 *    student's own join link (a meeting with manual approval returns no link);
 *  - one device per link, so a second person using a forwarded link removes the first;
 *  - waiting room on and no joining before the host;
 *  - automatic cloud recording (the account has local recording switched off and locked);
 *  - no confirmation emails, because the app, not Zoom, tells students how to join.
 */

export interface CreatedZoomMeeting {
  meetingId: string;
}

/** `startLocal` is Pakistan wall-clock time, "YYYY-MM-DDTHH:mm:00". */
export async function createZoomClassMeeting(input: { topic: string; startLocal: string; durationMinutes: number }): Promise<CreatedZoomMeeting> {
  const credentials = await getZoomCredentials();
  if (!credentials) throw new ZoomApiError("Zoom isn't connected yet. Connect it under Settings → Integrations.", 400);

  const meeting = await zoomFetch<{ id: number | string }>(`/users/${encodeURIComponent(credentials.hostEmail)}/meetings`, {
    method: "POST",
    body: {
      topic: input.topic.slice(0, 200),
      type: 2,
      start_time: input.startLocal,
      timezone: "Asia/Karachi",
      duration: Math.max(15, Math.min(input.durationMinutes, 600)),
      settings: {
        approval_type: 0,
        registration_type: 1,
        registrants_confirmation_email: false,
        registrants_email_notification: false,
        allow_multiple_devices: false,
        waiting_room: true,
        join_before_host: false,
        auto_recording: "cloud",
        mute_upon_entry: true,
        participant_video: false,
        host_video: true,
        meeting_authentication: false,
        use_pmi: false,
        audio: "both",
      },
    },
  });
  if (!meeting?.id) throw new ZoomApiError("Zoom didn't return a meeting.", 502);
  return { meetingId: String(meeting.id) };
}

/** Removes a meeting. A meeting that is already gone is not an error. */
export async function deleteZoomMeeting(meetingId: string): Promise<void> {
  try {
    await zoomFetch(`/meetings/${encodeURIComponent(meetingId)}`, { method: "DELETE" });
  } catch (err) {
    if (err instanceof ZoomApiError && (err.status === 404 || err.code === 3001)) return;
    throw err;
  }
}

export interface ZoomRegistration {
  registrantId: string;
  /** This student's own link for this meeting. Never shown to anyone else. */
  joinUrl: string;
}

/** Registers one student for one meeting and returns their personal join link. */
export async function registerZoomStudent(meetingId: string, student: { email: string; firstName: string; lastName: string }): Promise<ZoomRegistration> {
  const reg = await zoomFetch<{ registrant_id: string; join_url: string }>(`/meetings/${encodeURIComponent(meetingId)}/registrants`, {
    method: "POST",
    body: { email: student.email, first_name: student.firstName, last_name: student.lastName.slice(0, 64) || "-", auto_approve: true },
  });
  if (!reg?.join_url) throw new ZoomApiError("Zoom didn't return a join link.", 502);
  return { registrantId: reg.registrant_id, joinUrl: reg.join_url };
}

/** Cancels a student's registration (used when their fees lapse). */
export async function cancelZoomRegistration(meetingId: string, registrantId: string): Promise<void> {
  await zoomFetch(`/meetings/${encodeURIComponent(meetingId)}/registrants/status`, {
    method: "PUT",
    body: { action: "cancel", registrants: [{ id: registrantId }] },
  });
}

/**
 * The link a teacher uses to START the meeting as its host. Zoom issues these with a short life, so it
 * is fetched fresh at the moment of starting and never stored.
 */
export async function getZoomHostStartUrl(meetingId: string): Promise<string> {
  const meeting = await zoomFetch<{ start_url?: string }>(`/meetings/${encodeURIComponent(meetingId)}`);
  if (!meeting?.start_url) throw new ZoomApiError("Zoom didn't return a start link.", 502);
  return meeting.start_url;
}
