"use server";

import { requireRoleSession } from "@/lib/session";
import * as studentService from "@/lib/services/students";
import * as contentProgressService from "@/lib/services/content-progress";

export async function markStudyMaterialReadAction(materialId: string) {
  const session = await requireRoleSession(["STUDENT"]);
  const student = await studentService.getStudentByUserId(session.user.id);
  if (!student) throw new Error("Student profile not found.");
  await contentProgressService.markContentComplete(student.id, "STUDY_MATERIAL", materialId);
}
