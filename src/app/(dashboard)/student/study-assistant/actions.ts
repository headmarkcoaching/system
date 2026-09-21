"use server";

import { requireSession } from "@/lib/session";
import * as studentService from "@/lib/services/students";
import { askQuestion } from "@/lib/services/ai-assistant";

export async function askStudyAssistantAction(conversationId: string, question: string) {
  const session = await requireSession();
  if (session.user.role !== "STUDENT") throw new Error("Only students can use the Study Assistant.");

  const student = await studentService.getStudentByUserId(session.user.id);
  if (!student) throw new Error("Student record not found.");
  const context = await studentService.getStudentAIContext(student.id);
  if (!context) throw new Error("Student profile not found.");

  return askQuestion({ userId: session.user.id, conversationId, question, studentContext: context });
}
