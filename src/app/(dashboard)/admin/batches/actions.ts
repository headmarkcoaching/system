"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRoleSession, requireSession } from "@/lib/session";
import { STAFF_ROLES, ACADEMIC_STAFF_ROLES } from "@/lib/permissions";
import { assertCanManageBatch } from "@/lib/access";
import { logAudit } from "@/lib/audit";
import * as batchService from "@/lib/services/batches";
import * as academicService from "@/lib/services/academic-structure";
import * as teacherAssistantService from "@/lib/services/teacher-assistant";
import * as studentService from "@/lib/services/students";
import * as uploadedFilesService from "@/lib/services/uploaded-files";
import * as googleMeetService from "@/lib/googlemeet";

function revalidateBatch(id: string) {
  revalidatePath(`/batches/${id}`);
  revalidatePath("/admin/batches");
}

// ---- Batch CRUD ----

const createBatchSchema = z.object({
  name: z.string().min(2, "Batch name is required"),
  academicLevelId: z.string().min(1, "Academic level is required"),
  boardId: z.string().optional(),
  groupId: z.string().optional(),
  programId: z.string().optional(),
  maxStudents: z.coerce.number().int().min(1).default(30),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  status: z.enum(["UPCOMING", "ACTIVE", "COMPLETED", "ARCHIVED"]),
});

export interface CreateBatchState {
  error?: string;
}

export async function createBatchAction(_prevState: CreateBatchState, formData: FormData): Promise<CreateBatchState> {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = createBatchSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const batch = await batchService.createBatch({ ...parsed.data, createdById: session.user.id });
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "Batch", entityId: batch.id, after: batch });

  revalidatePath("/admin/batches");
  redirect(`/batches/${batch.id}`);
}

export async function updateBatchAction(id: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(STAFF_ROLES);
  const parsed = createBatchSchema.partial().safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const record = await batchService.updateBatch(id, parsed.data);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "Batch", entityId: id, after: record });
  revalidateBatch(id);
}

export async function setBatchLeaderboardAction(id: string, enabled: boolean) {
  const session = await requireRoleSession(STAFF_ROLES);
  const record = await batchService.setLeaderboardEnabled(id, enabled);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "Batch", entityId: id, after: { leaderboardEnabled: enabled } });
  revalidateBatch(id);
  revalidatePath("/admin/leaderboard");
  return record;
}

// ---- Roster ----

export async function addStudentToBatchAction(batchId: string, studentId: string) {
  const session = await requireRoleSession(STAFF_ROLES);
  await batchService.addStudentToBatch(batchId, studentId);
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "BatchStudent", entityId: batchId, after: { studentId } });
  revalidateBatch(batchId);
}

export async function removeStudentFromBatchAction(batchId: string, studentId: string) {
  const session = await requireRoleSession(STAFF_ROLES);
  await batchService.removeStudentFromBatch(batchId, studentId);
  await logAudit({ actorId: session.user.id, action: "DELETE", entityType: "BatchStudent", entityId: batchId, after: { studentId } });
  revalidateBatch(batchId);
}

export async function assignTeacherAction(batchId: string, teacherId: string, subjectId?: string) {
  const session = await requireRoleSession(STAFF_ROLES);
  await batchService.assignTeacherToBatch(batchId, teacherId, subjectId);
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "BatchTeacher", entityId: batchId, after: { teacherId, subjectId } });
  revalidateBatch(batchId);
}

export async function removeTeacherAction(batchId: string, batchTeacherId: string) {
  const session = await requireRoleSession(STAFF_ROLES);
  await batchService.removeTeacherFromBatch(batchTeacherId);
  await logAudit({ actorId: session.user.id, action: "DELETE", entityType: "BatchTeacher", entityId: batchTeacherId });
  revalidateBatch(batchId);
}

export async function addSubjectAction(batchId: string, subjectId: string) {
  const session = await requireRoleSession(STAFF_ROLES);
  await batchService.addSubjectToBatch(batchId, subjectId);
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "BatchSubject", entityId: batchId, after: { subjectId } });
  revalidateBatch(batchId);
}

export async function removeSubjectAction(batchId: string, batchSubjectId: string) {
  const session = await requireRoleSession(STAFF_ROLES);
  await batchService.removeSubjectFromBatch(batchSubjectId);
  await logAudit({ actorId: session.user.id, action: "DELETE", entityType: "BatchSubject", entityId: batchSubjectId });
  revalidateBatch(batchId);
}

// ---- Timetable ----

const timetableSchema = z.object({
  subjectId: z.string().min(1, "Subject is required"),
  teacherId: z.string().min(1, "Teacher is required"),
  dayOfWeek: z.enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"]),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
});

export async function createTimetableEntryAction(batchId: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  await assertCanManageBatch(session, batchId);
  const parsed = timetableSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await batchService.createTimetableEntry({ batchId, ...parsed.data });
  revalidateBatch(batchId);
  revalidatePath("/admin/timetable");
}

export async function deleteTimetableEntryAction(batchId: string, id: string) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  await assertCanManageBatch(session, batchId);
  await batchService.deleteTimetableEntry(id);
  revalidateBatch(batchId);
  revalidatePath("/admin/timetable");
}

// ---- Live classes ----

const liveClassSchema = z.object({
  title: z.string().min(2, "Title is required"),
  subjectId: z.string().min(1, "Subject is required"),
  chapter: z.string().optional(),
  teacherId: z.string().min(1, "Teacher is required"),
  scheduledDate: z.string().min(1, "Date is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  meetingProvider: z.enum(["ZOOM", "GOOGLE_MEET", "CUSTOM"]),
  // Required for ZOOM/CUSTOM (staff paste their own link); optional for GOOGLE_MEET, where
  // leaving it blank auto-creates a real Meet link via the Calendar API below.
  meetingLink: z.string().url("Enter a valid meeting link").optional().or(z.literal("")),
});

export async function createLiveClassAction(batchId: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  await assertCanManageBatch(session, batchId);
  const parsed = liveClassSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let { meetingLink } = parsed.data;
  let googleEventId: string | undefined;

  if (parsed.data.meetingProvider === "GOOGLE_MEET" && !meetingLink) {
    const result = await googleMeetService.createMeeting({
      title: parsed.data.title,
      startDateTime: `${parsed.data.scheduledDate}T${parsed.data.startTime}:00`,
      endDateTime: `${parsed.data.scheduledDate}T${parsed.data.endTime}:00`,
    });
    if (result.status === "FAILED" || !result.meetingLink) return { error: `Couldn't auto-create a Google Meet link: ${result.failedReason ?? "no link returned"}` };
    meetingLink = result.meetingLink;
    googleEventId = result.eventId;
  } else if (!meetingLink) {
    return { error: "Enter a meeting link" };
  }

  const liveClass = await batchService.createLiveClass({ batchId, ...parsed.data, meetingLink, googleEventId, createdById: session.user.id });
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "LiveClass", entityId: liveClass.id, after: liveClass });
  revalidateBatch(batchId);
}

export async function updateLiveClassStatusAction(batchId: string, liveClassId: string, status: "UPCOMING" | "LIVE" | "COMPLETED" | "CANCELLED") {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  await assertCanManageBatch(session, batchId);
  const liveClass = await batchService.updateLiveClassStatus(liveClassId, status);

  if (status === "CANCELLED" && liveClass.googleEventId) {
    // Best-effort — an orphaned Calendar event isn't worth blocking the cancellation over.
    googleMeetService.deleteMeeting(liveClass.googleEventId).catch((err) => console.error("Google Meet event delete failed", err));
  }

  revalidateBatch(batchId);
}

// ---- Attendance ----

export async function markAttendanceAction(
  batchId: string,
  liveClassId: string,
  subjectId: string,
  date: string,
  entries: { studentId: string; status: string }[]
) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  await assertCanManageBatch(session, batchId);
  await batchService.markAttendance(liveClassId, batchId, subjectId, new Date(date), session.user.id, entries);
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "Attendance", entityId: liveClassId, after: { count: entries.length } });
  revalidateBatch(batchId);
}

// ---- Homework ----

const homeworkSchema = z.object({
  title: z.string().min(2, "Title is required"),
  description: z.string().min(2, "Description is required"),
  subjectId: z.string().min(1, "Subject is required"),
  chapter: z.string().optional(),
  dueDate: z.string().min(1, "Due date is required"),
  maxMarks: z.coerce.number().int().optional(),
  attachmentUrl: z.string().url().optional().or(z.literal("")),
});

export async function createHomeworkAction(batchId: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  await assertCanManageBatch(session, batchId);
  const parsed = homeworkSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const homework = await batchService.createHomework({
    ...parsed.data,
    attachmentUrl: parsed.data.attachmentUrl || undefined,
    batchId,
    createdById: session.user.id,
  });
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "Homework", entityId: homework.id, after: homework });
  revalidateBatch(batchId);
}

export async function suggestHomeworkDraftAction(batchId: string, data: { subjectId: string; chapter?: string; focusHint?: string }) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  await assertCanManageBatch(session, batchId);

  const subjects = await academicService.listSubjects();
  const subject = subjects.find((s) => s.id === data.subjectId);
  if (!subject) throw new Error("Subject not found.");

  return teacherAssistantService.suggestHomeworkDraft({
    subjectId: data.subjectId,
    subjectName: subject.name,
    chapter: data.chapter,
    focusHint: data.focusHint,
    requestedByUserId: session.user.id,
  });
}

export async function gradeHomeworkAction(
  batchId: string,
  submissionId: string,
  data: { marksObtained?: number; teacherFeedback?: string; status: "REVIEWED" | "RESUBMISSION_REQUESTED" }
) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  await assertCanManageBatch(session, batchId);
  await batchService.gradeHomeworkSubmission(submissionId, session.user.id, data);
  revalidateBatch(batchId);
  revalidatePath("/teacher/homework");
}

// Takes a single FormData rather than a File mixed into a positional-argument list — Next.js's
// Server Action argument encoder rejects a bare File alongside plain-object siblings ("Only
// plain objects... can be passed to Server Actions"), a real bug found live during the Phase 3E
// file-upload verification pass. FormData is the framework's own supported shape for this.
export async function submitHomeworkAction(homeworkId: string, submissionId: string, formData: FormData) {
  const session = await requireSession();
  if (session.user.role !== "STUDENT") throw new Error("Only students can submit homework.");
  const student = await studentService.getStudentByUserId(session.user.id);
  if (!student) throw new Error("Student profile not found.");

  const data = {
    attachmentUrl: (formData.get("attachmentUrl") as string) || undefined,
    studentComments: (formData.get("studentComments") as string) || undefined,
  };
  const file = formData.get("file");

  let attachmentFileId: string | undefined;
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadedFilesService.uploadFile({ file, purpose: "HOMEWORK_SUBMISSION", uploadedById: session.user.id });
    attachmentFileId = uploaded.id;
  }

  await batchService.studentSubmitHomework(submissionId, student.id, { ...data, attachmentFileId });
  revalidatePath("/student/homework");
}

// ---- Recordings ----

const recordingSchema = z.object({
  title: z.string().min(2, "Title is required"),
  subjectId: z.string().min(1, "Subject is required"),
  chapter: z.string().optional(),
  recordingDate: z.string().min(1, "Date is required"),
  recordingUrl: z.string().url("Enter a valid recording link"),
  // Required, not optional — this is what lets a student's attendance for that specific class
  // determine whether they're eligible to request the recording. Without it, nobody could ever
  // unlock anything.
  liveClassId: z.string().min(1, "Select which live class session this recording is of"),
});

export async function createRecordingAction(batchId: string, data: Record<string, unknown>) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  await assertCanManageBatch(session, batchId);
  const parsed = recordingSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const recording = await batchService.createRecording({ ...parsed.data, batchId, createdById: session.user.id });
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "ClassRecording", entityId: recording.id, after: recording });
  revalidateBatch(batchId);
}
