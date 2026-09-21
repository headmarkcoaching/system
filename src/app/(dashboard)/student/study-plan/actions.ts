"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { generateStudyPlan } from "@/lib/services/study-plan";
import * as studentService from "@/lib/services/students";

export async function generateStudyPlanAction(force: boolean) {
  const session = await requireSession();
  if (session.user.role !== "STUDENT") throw new Error("Only students can use the Study Plan.");

  const student = await studentService.getStudentByUserId(session.user.id);
  if (!student) throw new Error("Student record not found.");

  const result = await generateStudyPlan(student.id, { requestedByUserId: session.user.id, force });
  revalidatePath("/student/study-plan");
  return result;
}
