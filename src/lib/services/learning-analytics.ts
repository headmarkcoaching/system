import "server-only";
import { db } from "@/lib/db";

function avg(arr: number[]) {
  return arr.length === 0 ? 0 : Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10;
}

export interface SubjectBreakdownRow {
  subjectId: string;
  subjectName: string;
  average: number;
  testCount: number;
}
export interface ChapterBreakdownRow {
  subjectName: string;
  chapter: string;
  average: number;
  testCount: number;
}
export interface TopicBreakdownRow {
  subjectName: string;
  topic: string;
  average: number;
  questionCount: number;
}

/** Per-student breakdown of test performance by Subject, Chapter, and Topic — unlike
 * analytics.ts's academicAnalytics() (academy-wide, for the admin Analytics page), this is
 * scoped to one student, surfaced on their own Performance tab. Chapter uses the existing
 * Test.chapter field (one chapter per test); Topic uses the new TestQuestion.topic field
 * (one topic per question) so it can be sparser — only questions a teacher/AI tagged with a
 * topic show up there, which is expected and shown as an empty state rather than an error. */
export async function getStudentLearningAnalytics(studentId: string) {
  const results = await db.testResult.findMany({
    where: { studentId, gradedAt: { not: null } },
    select: {
      marksObtained: true,
      totalMarks: true,
      attempt: { select: { answers: true } },
      test: {
        select: {
          chapter: true,
          subject: { select: { id: true, name: true } },
          questions: { select: { id: true, marks: true, topic: true } },
        },
      },
    },
  });

  const bySubject = new Map<string, { name: string; scores: number[] }>();
  const byChapter = new Map<string, { subjectName: string; chapter: string; scores: number[] }>();
  const byTopic = new Map<string, { subjectName: string; topic: string; scores: number[] }>();

  for (const r of results) {
    const percent = r.totalMarks === 0 ? 0 : (r.marksObtained / r.totalMarks) * 100;

    const subjectKey = r.test.subject.id;
    if (!bySubject.has(subjectKey)) bySubject.set(subjectKey, { name: r.test.subject.name, scores: [] });
    bySubject.get(subjectKey)!.scores.push(percent);

    if (r.test.chapter) {
      const chapterKey = `${subjectKey}::${r.test.chapter}`;
      if (!byChapter.has(chapterKey)) byChapter.set(chapterKey, { subjectName: r.test.subject.name, chapter: r.test.chapter, scores: [] });
      byChapter.get(chapterKey)!.scores.push(percent);
    }

    const answers = r.attempt?.answers as Record<string, { marksAwarded: number | null }> | null;
    for (const q of r.test.questions) {
      if (!q.topic) continue;
      const awarded = answers?.[q.id]?.marksAwarded;
      if (awarded === null || awarded === undefined || q.marks === 0) continue;
      const questionPercent = (awarded / q.marks) * 100;
      const topicKey = `${subjectKey}::${q.topic}`;
      if (!byTopic.has(topicKey)) byTopic.set(topicKey, { subjectName: r.test.subject.name, topic: q.topic, scores: [] });
      byTopic.get(topicKey)!.scores.push(questionPercent);
    }
  }

  const subjects: SubjectBreakdownRow[] = Array.from(bySubject.entries())
    .map(([subjectId, v]) => ({ subjectId, subjectName: v.name, average: avg(v.scores), testCount: v.scores.length }))
    .sort((a, b) => a.average - b.average);

  const chapters: ChapterBreakdownRow[] = Array.from(byChapter.values())
    .map((v) => ({ subjectName: v.subjectName, chapter: v.chapter, average: avg(v.scores), testCount: v.scores.length }))
    .sort((a, b) => a.average - b.average);

  const topics: TopicBreakdownRow[] = Array.from(byTopic.values())
    .map((v) => ({ subjectName: v.subjectName, topic: v.topic, average: avg(v.scores), questionCount: v.scores.length }))
    .sort((a, b) => a.average - b.average);

  return { subjects, chapters, topics };
}
