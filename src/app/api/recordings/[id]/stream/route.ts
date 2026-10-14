import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getVerifiedSession } from "@/lib/session";
import { assertCanManageBatch } from "@/lib/access";
import { STAFF_ROLES } from "@/lib/permissions";
import { getActiveAccessExpiry } from "@/lib/services/recording-access";
import { GoogleDriveStorageProvider } from "@/lib/storage/providers/google-drive-provider";

/**
 * Streams a lecture stored in the academy's Google Drive to a signed-in viewer.
 *
 * The Drive file is private: students never receive a Drive link, only this address, and every
 * request (including each seek or buffering step while a video plays) re-checks that they are
 * still allowed. When a student's 48 hours end, the next chunk request is refused and playback
 * stops, rather than the video simply carrying on from a link that never expires.
 *
 * It honours the browser's Range header so the video can start quickly and be scrubbed.
 */
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const session = await getVerifiedSession();
  if (!session?.user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const recording = await db.classRecording.findUnique({ where: { id }, select: { id: true, batchId: true, driveFileId: true, mimeType: true } });
  if (!recording?.driveFileId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = session.user.role;
  if (!STAFF_ROLES.includes(role)) {
    if (role === "TEACHER") {
      try {
        await assertCanManageBatch(session, recording.batchId);
      } catch {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (role === "STUDENT") {
      const student = await db.student.findUnique({ where: { userId: session.user.id }, select: { id: true } });
      const member = student ? await db.batchStudent.findFirst({ where: { studentId: student.id, batchId: recording.batchId }, select: { id: true } }) : null;
      const until = student && member ? await getActiveAccessExpiry(student.id, recording.id) : null;
      if (!until) return NextResponse.json({ error: "Your viewing time for this recording has ended, or you haven't unlocked it." }, { status: 403 });
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  let upstream: Response;
  try {
    upstream = await new GoogleDriveStorageProvider().openStream(recording.driveFileId, request.headers.get("range"));
  } catch (err) {
    console.error("recording stream failed to open", err);
    return NextResponse.json({ error: "The video isn't available right now." }, { status: 502 });
  }
  if (upstream.status === 404) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (upstream.status === 416) return new NextResponse(null, { status: 416, headers: { "Content-Range": upstream.headers.get("content-range") ?? "*/0" } });
  if (!upstream.ok || !upstream.body) return NextResponse.json({ error: "The video isn't available right now." }, { status: 502 });

  const headers = new Headers({
    "Content-Type": recording.mimeType ?? upstream.headers.get("content-type") ?? "video/mp4",
    "Accept-Ranges": "bytes",
    // Never cached by the browser or any proxy: a saved copy would outlive the 48 hours.
    "Cache-Control": "private, no-store",
    "Content-Disposition": 'inline; filename="lecture"',
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "same-origin",
  });
  for (const h of ["content-length", "content-range"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }

  return new NextResponse(upstream.body, { status: upstream.status, headers });
}

export const dynamic = "force-dynamic";
// A long lecture streams for a while; give each request room (the video is fetched in many short ranges).
export const maxDuration = 300;
