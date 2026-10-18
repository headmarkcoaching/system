import "server-only";
import type { ZoomJoinKind } from "@prisma/client";
import { db } from "@/lib/db";
import { getIntegrationSettingsInternal } from "@/lib/services/integration-settings";
import { getClassAccess } from "@/lib/services/class-access";
import { registrantEmail, cancelStudentZoomRegistrations } from "@/lib/services/zoom-join";
import * as notifications from "@/lib/services/notifications";
import { getStaffUserIds } from "@/lib/services/automation-recipients";

/**
 * Watching who comes into a class. Zoom reports every join and leave; each join is matched to the
 * student it was issued to. Anything that is not "a paid student on their own link" is recorded, and
 * the worst kinds (a stranger, or a student whose access had lapsed) alert staff and the teacher while
 * the class is still going.
 */

interface ParticipantPayload {
  user_name?: unknown;
  email?: unknown;
  participant_uuid?: unknown;
  id?: unknown;
  user_id?: unknown;
  registrant_id?: unknown;
  join_time?: unknown;
  leave_time?: unknown;
}

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

function participantKey(p: ParticipantPayload): string | null {
  return text(p.participant_uuid) ?? text(p.id) ?? text(p.user_id);
}

/** A join older than this with no "left" notice is treated as stale, not as a second device. */
const OPEN_SESSION_HOURS = 6;

export async function recordParticipantJoined(object: Record<string, unknown> | undefined, now = new Date()) {
  const participant = object?.participant as ParticipantPayload | undefined;
  const meetingId = object?.id != null ? String(object.id) : null;
  if (!participant || !meetingId) return;
  const key = participantKey(participant);
  if (!key) return;

  const liveClass = await db.liveClass.findUnique({
    where: { zoomMeetingId: meetingId },
    select: { id: true, title: true, teacher: { select: { userId: true } } },
  });
  if (!liveClass) return;

  const email = text(participant.email)?.toLowerCase() ?? null;
  const settings = await getIntegrationSettingsInternal();
  // The teacher joins as the host, with the host account's email.
  if (email && settings.zoomHostEmail && email === settings.zoomHostEmail.toLowerCase()) return;

  const joinedAt = text(participant.join_time) ? new Date(text(participant.join_time)!) : now;
  const displayName = text(participant.user_name) ?? "Unknown";
  const registrantId = text(participant.registrant_id);

  const registrations = await db.zoomRegistration.findMany({
    where: { liveClassId: liveClass.id },
    select: { id: true, studentId: true, registrantId: true, variant: true, cancelledAt: true, student: { select: { studentCode: true } } },
  });
  // Matched by the link's own id; if Zoom leaves that out, by the email the link was issued under.
  const reg =
    (registrantId ? registrations.find((r) => r.registrantId === registrantId) : undefined) ??
    (email ? registrations.find((r) => registrantEmail(r.student.studentCode, r.variant) === email) : undefined);

  let kind: ZoomJoinKind = "UNKNOWN";
  if (reg) {
    if (reg.cancelledAt) kind = "REVOKED";
    else if (!(await getClassAccess(reg.studentId, now)).allowed) kind = "REVOKED";
    else {
      const since = new Date(now.getTime() - OPEN_SESSION_HOURS * 3600_000);
      const open = await db.zoomJoinEvent.findFirst({
        where: { liveClassId: liveClass.id, studentId: reg.studentId, leftAt: null, joinedAt: { gte: since }, NOT: { participantUuid: key } },
        select: { id: true },
      });
      kind = open ? "DUPLICATE" : "EXPECTED";
    }
  }

  try {
    await db.zoomJoinEvent.create({
      data: { liveClassId: liveClass.id, studentId: reg?.studentId ?? null, participantUuid: key, displayName, email, kind, joinedAt },
    });
  } catch {
    return; // Zoom sent the same notice twice
  }

  if (kind === "UNKNOWN" || kind === "REVOKED") {
    const who = kind === "REVOKED" ? `${displayName} (fees overdue or access removed)` : `"${displayName}" (not registered for this class)`;
    const recipients = new Set(await getStaffUserIds());
    if (liveClass.teacher.userId) recipients.add(liveClass.teacher.userId);
    await notifications
      .createNotificationsForUsers([...recipients], {
        type: "ATTENDANCE_ALERT",
        title: kind === "REVOKED" ? "Student without access joined a class" : "Unregistered person in a class",
        message: `${who} is waiting to join "${liveClass.title}". Do not admit them unless you know who they are.`,
        relatedEntityType: "LIVE_CLASS",
        relatedEntityId: liveClass.id,
      })
      .catch((err) => console.error("Couldn't send the join alert", err));
  }
}

export async function recordParticipantLeft(object: Record<string, unknown> | undefined) {
  const participant = object?.participant as ParticipantPayload | undefined;
  const meetingId = object?.id != null ? String(object.id) : null;
  const key = participant ? participantKey(participant) : null;
  if (!participant || !meetingId || !key) return;
  const liveClass = await db.liveClass.findUnique({ where: { zoomMeetingId: meetingId }, select: { id: true } });
  if (!liveClass) return;
  const leftAt = text(participant.leave_time) ? new Date(text(participant.leave_time)!) : new Date();
  await db.zoomJoinEvent.updateMany({ where: { liveClassId: liveClass.id, participantUuid: key, leftAt: null }, data: { leftAt } });
}

/**
 * Closes the door on students whose fees have lapsed: any personal link already issued for an upcoming
 * or running class is cancelled in Zoom. (A link a student already used to get in cannot be pulled back
 * mid-class; the join alert tells the teacher not to admit them again.) Runs every few minutes, because
 * fees lapse with time rather than with an event.
 */
export async function revokeLapsedRegistrations(now = new Date()) {
  const open = await db.zoomRegistration.findMany({
    where: { cancelledAt: null, liveClass: { status: { in: ["UPCOMING", "LIVE"] }, zoomMeetingId: { not: null } } },
    select: { studentId: true },
    distinct: ["studentId"],
  });
  let cancelled = 0;
  for (const { studentId } of open) {
    if ((await getClassAccess(studentId, now)).allowed) continue;
    cancelled += await cancelStudentZoomRegistrations(studentId);
  }
  return { processed: cancelled };
}

export function listJoinAlerts(limit = 15) {
  return db.zoomJoinEvent.findMany({
    where: { kind: { not: "EXPECTED" }, createdAt: { gte: new Date(Date.now() - 7 * 86_400_000) } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { liveClass: { select: { title: true, batch: { select: { name: true } } } } },
  });
}
