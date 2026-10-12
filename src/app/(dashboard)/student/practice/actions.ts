"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRoleSession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rate-limit";
import * as studentService from "@/lib/services/students";
import * as practiceService from "@/lib/services/practice";

export interface PracticeActionResult {
  error?: string;
  sessionId?: string;
}

const startSchema = z.object({
  subjectId: z.string().min(1),
  scope: z.enum(["CHAPTER", "QUARTER", "HALF", "FULL", "PAST_PAPER", "WEAK_AREAS"]),
  mode: z.enum(["PRACTICE", "EXAM"]),
  chapterId: z.string().optional(),
  blockKey: z.string().optional(),
  pastPaperId: z.string().optional(),
  count: z.number().int().min(1).max(practiceService.MAX_PAPER_QUESTIONS).optional(),
  difficulty: z.enum(["MIXED", "EASY", "MEDIUM", "HARD"]).optional(),
  objectiveOnly: z.boolean().optional(),
});

async function currentStudentId() {
  const session = await requireRoleSession(["STUDENT"]);
  const student = await studentService.getStudentByUserId(session.user.id);
  if (!student) throw new Error("Your student profile was not found.");
  return { studentId: student.id, userId: session.user.id };
}

export async function startPracticeAction(input: z.input<typeof startSchema>): Promise<PracticeActionResult> {
  const { studentId, userId } = await currentStudentId();
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { error: "Those settings aren't valid. Please go back and choose again." };

  const rate = await checkRateLimit(`practice:start:${userId}`, { windowMs: 60 * 60 * 1000, max: 40 });
  if (!rate.allowed) return { error: "You've started a lot of papers in the last hour. Take a short break, then try again." };

  try {
    const session = await practiceService.startSession(studentId, parsed.data);
    revalidatePath("/student/practice");
    return { sessionId: session.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't build that paper. Please try again." };
  }
}

export async function submitPracticeAction(sessionId: string, answers: Record<string, string>): Promise<PracticeActionResult> {
  const { studentId } = await currentStudentId();
  if (typeof answers !== "object" || answers === null || Object.keys(answers).length > practiceService.MAX_PAPER_QUESTIONS * 2) return { error: "Those answers couldn't be read." };
  try {
    await practiceService.submitSession(sessionId, studentId, answers);
    revalidatePath("/student/practice");
    revalidatePath(`/student/practice/${sessionId}`);
    return { sessionId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't submit. Please try again." };
  }
}

export async function selfMarkAction(sessionId: string, marks: Record<string, number>): Promise<PracticeActionResult> {
  const { studentId } = await currentStudentId();
  try {
    await practiceService.selfMark(sessionId, studentId, marks);
    revalidatePath("/student/practice");
    revalidatePath(`/student/practice/${sessionId}`);
    return { sessionId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't save your marks." };
  }
}
