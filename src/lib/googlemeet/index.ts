import "server-only";
import { getGoogleCredentials, getGoogleAccessToken, getGoogleCalendarId } from "@/lib/google/oauth";

/**
 * Google Meet integration via the Google Calendar API — no googleapis SDK dependency, plain
 * fetch calls (matching the style of the WhatsApp providers in src/lib/whatsapp/providers/).
 *
 * Credentials come from IntegrationSettings (Settings → Integrations → Google, connected via
 * the in-app "Connect Google Account" OAuth flow — see src/app/api/integrations/google/*),
 * falling back to GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REFRESH_TOKEN/GOOGLE_CALENDAR_ID
 * env vars for a deployment set up before that flow existed.
 */

export interface GoogleMeetResult {
  status: "CREATED" | "FAILED";
  meetingLink?: string;
  eventId?: string;
  failedReason?: string;
}

export interface CreateMeetingInput {
  title: string;
  description?: string;
  /** Local date-time strings without a UTC offset (e.g. "2026-09-10T16:00:00") — paired with
   * `timeZone` so Google interprets them the same way the rest of this app's naive
   * date + "HH:mm" fields are meant to be read: as Pakistan wall-clock time, not UTC. */
  startDateTime: string;
  endDateTime: string;
  timeZone?: string;
  attendeeEmails?: string[];
}

/** Creates a Calendar event with a Google Meet link attached, returning the join link and the
 * Calendar event id (store the id so a later edit/cancel can update the same event instead of
 * creating an orphan). */
export async function createMeeting(input: CreateMeetingInput): Promise<GoogleMeetResult> {
  try {
    const credentials = await getGoogleCredentials();
    if (!credentials) return { status: "FAILED", failedReason: "Google isn't connected yet — connect it under Settings → Integrations" };

    const accessToken = await getGoogleAccessToken(credentials);
    const calendarId = await getGoogleCalendarId();
    const requestId = `meet-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: input.title,
        description: input.description,
        start: { dateTime: input.startDateTime, timeZone: input.timeZone || "Asia/Karachi" },
        end: { dateTime: input.endDateTime, timeZone: input.timeZone || "Asia/Karachi" },
        attendees: input.attendeeEmails?.map((email) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return { status: "FAILED", failedReason: `Google Calendar API ${res.status}: ${errorText}` };
    }

    const data = (await res.json()) as { id: string; conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] } };
    const meetingLink = data.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri;
    if (!meetingLink) {
      return { status: "FAILED", failedReason: "Calendar event was created but no Google Meet link was returned" };
    }

    return { status: "CREATED", meetingLink, eventId: data.id };
  } catch (error) {
    return { status: "FAILED", failedReason: error instanceof Error ? error.message : "Unknown error" };
  }
}

/** Deletes the Calendar event backing a previously auto-created Meet link — call when a
 * GOOGLE_MEET live class is cancelled or rescheduled, so the calendar doesn't accumulate
 * orphaned events. Never throws; a failure here shouldn't block the class-side action. */
export async function deleteMeeting(eventId: string): Promise<{ status: "DELETED" | "FAILED"; failedReason?: string }> {
  try {
    const credentials = await getGoogleCredentials();
    if (!credentials) return { status: "FAILED", failedReason: "Google isn't connected" };

    const accessToken = await getGoogleAccessToken(credentials);
    const calendarId = await getGoogleCalendarId();
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok && res.status !== 410) {
      const errorText = await res.text();
      return { status: "FAILED", failedReason: `Google Calendar API ${res.status}: ${errorText}` };
    }
    return { status: "DELETED" };
  } catch (error) {
    return { status: "FAILED", failedReason: error instanceof Error ? error.message : "Unknown error" };
  }
}
