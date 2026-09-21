import "server-only";
import { db } from "@/lib/db";

export type LearningPathStepKey = "LECTURE" | "NOTES" | "HOMEWORK" | "QUIZ";

export interface LearningPathStep {
  key: LearningPathStepKey;
  label: string;
  /** null = no content of this type exists for this chapter yet (not "incomplete") */
  status: "COMPLETE" | "INCOMPLETE" | "NOT_AVAILABLE";
}

export interface LearningPathChapter {
  chapter: string;
  steps: LearningPathStep[];
  completedSteps: number;
  totalSteps: number;
}

/** Structured Lecture -> Notes -> Homework -> Quiz -> Complete path per chapter, derived
 * entirely from existing content (LiveClass/ClassRecording/StudyMaterial/Homework/Test all
 * already carry a nullable `chapter` field) plus real completion signals — attendance for
 * Lecture, ContentProgress for Notes/recording-watched, HomeworkSubmission status for
 * Homework, TestResult existence (attempted) for Quiz. No new content model; only completion
 * tracking is new. Chapters are ordered by first appearance across the five source tables —
 * there's no explicit chapter-sequence field in the schema yet, so this is an approximation
 * of authoring order, not a guaranteed one. */
export async function getLearningPath(studentId: string, subjectId: string): Promise<LearningPathChapter[]> {
  const student = await db.student.findUniqueOrThrow({ where: { id: studentId }, select: { academicLevelId: true } });
  const batchIds = (await db.batchStudent.findMany({ where: { studentId }, select: { batchId: true } })).map((b) => b.batchId);

  const [liveClasses, recordings, homework, tests, materials, attendance, contentProgress, homeworkSubs, testResults] = await Promise.all([
    db.liveClass.findMany({ where: { batchId: { in: batchIds }, subjectId, chapter: { not: null } }, select: { id: true, chapter: true } }),
    db.classRecording.findMany({ where: { batchId: { in: batchIds }, subjectId, chapter: { not: null } }, select: { id: true, chapter: true } }),
    db.homework.findMany({ where: { batchId: { in: batchIds }, subjectId, chapter: { not: null } }, select: { id: true, chapter: true } }),
    db.test.findMany({ where: { batchId: { in: batchIds }, subjectId, chapter: { not: null } }, select: { id: true, chapter: true } }),
    db.studyMaterial.findMany({ where: { academicLevelId: student.academicLevelId, subjectId, chapter: { not: null } }, select: { id: true, chapter: true } }),
    db.attendance.findMany({ where: { studentId, subjectId, status: { in: ["PRESENT", "LATE"] } }, select: { liveClassId: true } }),
    db.contentProgress.findMany({ where: { studentId, completed: true }, select: { contentKind: true, contentId: true } }),
    db.homeworkSubmission.findMany({ where: { studentId, status: { in: ["SUBMITTED", "REVIEWED"] } }, select: { homeworkId: true } }),
    db.testResult.findMany({ where: { studentId }, select: { testId: true } }),
  ]);

  const attendedLiveClassIds = new Set(attendance.map((a) => a.liveClassId));
  const watchedRecordingIds = new Set(contentProgress.filter((c) => c.contentKind === "RECORDING").map((c) => c.contentId));
  const readMaterialIds = new Set(contentProgress.filter((c) => c.contentKind === "STUDY_MATERIAL").map((c) => c.contentId));
  const submittedHomeworkIds = new Set(homeworkSubs.map((h) => h.homeworkId));
  const attemptedTestIds = new Set(testResults.map((r) => r.testId));

  const chapterOrder: string[] = [];
  const byChapter = new Map<
    string,
    { liveClasses: typeof liveClasses; recordings: typeof recordings; homework: typeof homework; tests: typeof tests; materials: typeof materials }
  >();

  function ensure(chapter: string) {
    if (!byChapter.has(chapter)) {
      chapterOrder.push(chapter);
      byChapter.set(chapter, { liveClasses: [], recordings: [], homework: [], tests: [], materials: [] });
    }
    return byChapter.get(chapter)!;
  }

  for (const lc of liveClasses) ensure(lc.chapter!).liveClasses.push(lc);
  for (const r of recordings) ensure(r.chapter!).recordings.push(r);
  for (const m of materials) ensure(m.chapter!).materials.push(m);
  for (const h of homework) ensure(h.chapter!).homework.push(h);
  for (const t of tests) ensure(t.chapter!).tests.push(t);

  function stepStatus(hasAny: boolean, isDone: (id: string) => boolean, ids: string[]): LearningPathStep["status"] {
    if (!hasAny) return "NOT_AVAILABLE";
    return ids.some(isDone) ? "COMPLETE" : "INCOMPLETE";
  }

  return chapterOrder.map((chapter) => {
    const c = byChapter.get(chapter)!;
    const lectureDone = c.liveClasses.some((lc) => attendedLiveClassIds.has(lc.id)) || c.recordings.some((r) => watchedRecordingIds.has(r.id));
    const hasLecture = c.liveClasses.length > 0 || c.recordings.length > 0;

    const steps: LearningPathStep[] = [
      { key: "LECTURE", label: "Lecture", status: !hasLecture ? "NOT_AVAILABLE" : lectureDone ? "COMPLETE" : "INCOMPLETE" },
      {
        key: "NOTES",
        label: "Notes",
        status: stepStatus(
          c.materials.length > 0,
          (id) => readMaterialIds.has(id),
          c.materials.map((m) => m.id)
        ),
      },
      {
        key: "HOMEWORK",
        label: "Homework",
        status: stepStatus(
          c.homework.length > 0,
          (id) => submittedHomeworkIds.has(id),
          c.homework.map((h) => h.id)
        ),
      },
      {
        key: "QUIZ",
        label: "Quiz",
        status: stepStatus(
          c.tests.length > 0,
          (id) => attemptedTestIds.has(id),
          c.tests.map((t) => t.id)
        ),
      },
    ];

    const applicable = steps.filter((s) => s.status !== "NOT_AVAILABLE");
    return {
      chapter,
      steps,
      completedSteps: applicable.filter((s) => s.status === "COMPLETE").length,
      totalSteps: applicable.length,
    };
  });
}

export function overallCompletionPercent(chapters: LearningPathChapter[]): number {
  const totalSteps = chapters.reduce((s, c) => s + c.totalSteps, 0);
  const completedSteps = chapters.reduce((s, c) => s + c.completedSteps, 0);
  return totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);
}
