import { NextRequest, NextResponse, after } from "next/server";
import { getIntegrationSettingsInternal } from "@/lib/services/integration-settings";
import { verifyZoomSignature, answerUrlValidation } from "@/lib/zoom/webhook";
import { recordParticipantJoined, recordParticipantLeft } from "@/lib/services/zoom-participants";
import { enqueueRecordingCompleted, handleMeetingEnded, processRecordingJob } from "@/lib/services/zoom-recordings";

// Server-to-server route for Zoom's notices ("recording is ready", "class ended"). There is no login
// here: every request must carry Zoom's signature, made with the Secret Token saved under
// Settings → Integrations → Zoom, or it is refused before anything is read from it.
// middleware.ts lets /api/zoom through for the same reason it lets /api/cron through.
const MAX_BODY_BYTES = 1_000_000;

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Too large" }, { status: 413 });

  const { zoomWebhookSecret } = await getIntegrationSettingsInternal();
  if (!zoomWebhookSecret) return NextResponse.json({ error: "Zoom notices aren't set up." }, { status: 503 });

  let body: { event?: string; payload?: { plainToken?: unknown; object?: Record<string, unknown> }; download_token?: unknown };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const signature = request.headers.get("x-zm-signature");
  const timestamp = request.headers.get("x-zm-request-timestamp");

  // Zoom's address check. It is signed too, but is also answered when it isn't, since the token it
  // carries is only ever signed back (see answerUrlValidation).
  if (body.event === "endpoint.url_validation") {
    if (signature && !verifyZoomSignature({ secret: zoomWebhookSecret, rawBody, signature, timestamp })) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    const answer = answerUrlValidation(zoomWebhookSecret, body.payload?.plainToken);
    return answer ? NextResponse.json(answer) : NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!verifyZoomSignature({ secret: zoomWebhookSecret, rawBody, signature, timestamp })) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    if (body.event === "recording.completed") {
      const { jobId } = await enqueueRecordingCompleted(body);
      // Zoom wants an answer within seconds, so the copy runs after the reply; the "zoom-recordings"
      // job picks it up again if this run is cut short.
      if (jobId) after(() => processRecordingJob(jobId).catch((err) => console.error("Recording copy crashed", err)));
    } else if (body.event === "meeting.ended") {
      const id = body.payload?.object?.id;
      if (id != null) await handleMeetingEnded(String(id));
    } else if (body.event === "meeting.participant_joined") {
      await recordParticipantJoined(body.payload?.object);
    } else if (body.event === "meeting.participant_left") {
      await recordParticipantLeft(body.payload?.object);
    }
  } catch (err) {
    console.error("Zoom notice handling failed", body.event, err);
    // A 500 makes Zoom send the notice again, which is what we want for a database hiccup.
    return NextResponse.json({ error: "Could not process" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
// The copy of a long recording runs after the reply and needs more than the default time.
export const maxDuration = 300;
