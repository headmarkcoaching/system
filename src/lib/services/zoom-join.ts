import "server-only";
import { db } from "@/lib/db";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { combineDateAndTime, formatTime } from "@/lib/utils";
import { STAFF_ROLES } from "@/lib/permissions";
import { registerZoomStudent, cancelZoomRegistration, getZoomHostStartUrl } from "@/lib/zoom/meetings";
import type { RoleKey } from "@prisma/client";

/** A teacher can start a class from this long before it begins... */
export const START_EARLY_MINUTES = 30;
/** ...until this long after it was due to end (a lesson that overruns can still be reopened). */
export const START_LATE_MINUTES = 30;

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return { firstName: parts[0] || "Student", lastName: parts.slice(1).join(" ") || "-" };
}

/** Zoom wants an email per registrant. Nothing is ever sent to it (Zoom's emails are off for these
 * meetings); it only has to be unique per student. example.com is reserved and can't deliver mail. */
export function registrantEmail(studentCode: string, variant: number) {
  const base = studentCode.toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${base}${variant > 1 ? `+r${variant}` : ""}@example.com`;
}

/**
 * This student's own join link for this class, registering them first if this is their first time. A
 * second press of Join returns the same link and never creates a second registration. The caller must
 * already have checked that the student may join (batch, fees, class live).
 */
export async function getStudentZoomJoinUrl(studentId: string, liveClassId: string, zoomMeetingId: string): Promise<string> {
  const existing = await db.zoomRegistration.findUnique({ where: { liveClassId_studentId: { liveClassId, studentId } } });
  if (existing && !existing.cancelledAt) return decryptSecret(existing.joinUrlEnc);

  const student = await db.student.findUniqueOrThrow({ where: { id: studentId }, select: { studentCode: true, fullName: true } });
  const variant = existing ? existing.variant + 1 : 1;
  const { firstName, lastName } = splitName(student.fullName);
  const reg = await registerZoomStudent(zoomMeetingId, { email: registrantEmail(student.studentCode, variant), firstName, lastName });
  const joinUrlEnc = encryptSecret(reg.joinUrl);

  try {
    if (existing) {
      await db.zoomRegistration.update({ where: { id: existing.id }, data: { registrantId: reg.registrantId, joinUrlEnc, variant, cancelledAt: null } });
    } else {
      await db.zoomRegistration.create({ data: { liveClassId, studentId, registrantId: reg.registrantId, joinUrlEnc, variant } });
    }
  } catch (err) {
    // Two taps at once: the other request saved first, so use its link and drop this duplicate registration.
    const winner = await db.zoomRegistration.findUnique({ where: { liveClassId_studentId: { liveClassId, studentId } } });
    if (winner && !winner.cancelledAt && winner.registrantId !== reg.registrantId) {
      await cancelZoomRegistration(zoomMeetingId, reg.registrantId).catch(() => {});
      return decryptSecret(winner.joinUrlEnc);
    }
    if (winner && winner.registrantId === reg.registrantId) return reg.joinUrl;
    throw err;
  }
  return reg.joinUrl;
}

export class StartClassError extends Error {}

/**
 * The host link for starting a Zoom class, for its own teacher or for staff. Zoom's start links are
 * short-lived, so a fresh one is fetched now and never stored. Starting also marks the class live,
 * which is what makes the Join button appear for students.
 */
export async function getTeacherStartUrl(user: { id: string; role: RoleKey }, liveClassId: string, now = new Date()): Promise<string> {
  const liveClass = await db.liveClass.findUnique({
    where: { id: liveClassId },
    select: { id: true, status: true, scheduledDate: true, startTime: true, endTime: true, zoomMeetingId: true, teacher: { select: { userId: true } } },
  });
  if (!liveClass || !liveClass.zoomMeetingId) throw new StartClassError("That class isn't a Zoom class.");

  const isStaff = STAFF_ROLES.includes(user.role);
  if (!isStaff && liveClass.teacher.userId !== user.id) throw new StartClassError("Only this class's teacher can start it.");
  if (liveClass.status === "CANCELLED") throw new StartClassError("This class was cancelled.");
  if (liveClass.status === "COMPLETED") throw new StartClassError("This class is already finished.");

  const startAt = combineDateAndTime(liveClass.scheduledDate, liveClass.startTime).getTime();
  const endAt = combineDateAndTime(liveClass.scheduledDate, liveClass.endTime).getTime();
  const earliest = startAt - START_EARLY_MINUTES * 60_000;
  if (now.getTime() < earliest) throw new StartClassError(`It's too early to start. You can open this class from ${formatTime(minutesBefore(liveClass.startTime, START_EARLY_MINUTES))}.`);
  if (now.getTime() > endAt + START_LATE_MINUTES * 60_000) throw new StartClassError("This class's time has passed.");

  const url = await getZoomHostStartUrl(liveClass.zoomMeetingId);
  if (liveClass.status !== "LIVE") await db.liveClass.update({ where: { id: liveClass.id }, data: { status: "LIVE" } });
  return url;
}

function minutesBefore(hhmm: string, minutes: number) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.max(0, h * 60 + m - minutes);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** For when a student's fees lapse: cancels their registration for every upcoming Zoom class. */
export async function cancelStudentZoomRegistrations(studentId: string) {
  const open = await db.zoomRegistration.findMany({
    where: { studentId, cancelledAt: null, liveClass: { status: { in: ["UPCOMING", "LIVE"] }, zoomMeetingId: { not: null } } },
    select: { id: true, registrantId: true, liveClass: { select: { zoomMeetingId: true } } },
  });
  let cancelled = 0;
  for (const r of open) {
    try {
      await cancelZoomRegistration(r.liveClass.zoomMeetingId!, r.registrantId);
      await db.zoomRegistration.update({ where: { id: r.id }, data: { cancelledAt: new Date() } });
      cancelled += 1;
    } catch (err) {
      console.error("Couldn't cancel a Zoom registration", err);
    }
  }
  return cancelled;
}
