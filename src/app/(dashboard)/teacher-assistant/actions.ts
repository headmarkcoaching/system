"use server";

import { requireRoleSession } from "@/lib/session";
import { ACADEMIC_STAFF_ROLES } from "@/lib/permissions";
import * as teacherAssistantService from "@/lib/services/teacher-assistant";
import * as academicService from "@/lib/services/academic-structure";

export async function suggestRevisionTopicsAction(studentId: string) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  return teacherAssistantService.suggestRevisionTopics(studentId, session.user.id);
}

export async function generateLessonSummaryAction(data: { subjectId: string; chapter: string; sourceText: string }) {
  const session = await requireRoleSession(ACADEMIC_STAFF_ROLES);
  const subjects = await academicService.listSubjects();
  const subject = subjects.find((s) => s.id === data.subjectId);
  if (!subject) throw new Error("Subject not found.");

  return teacherAssistantService.generateLessonSummary({
    subjectName: subject.name,
    chapter: data.chapter,
    sourceText: data.sourceText,
    requestedByUserId: session.user.id,
  });
}
