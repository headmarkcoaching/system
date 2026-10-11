import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as studentService from "@/lib/services/students";
import * as practiceService from "@/lib/services/practice";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { PracticeRunner } from "./practice-runner";
import { PracticeReview } from "./practice-review";

export default async function PracticeSessionPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const student = await studentService.getStudentByUserId(session.user.id);
  if (!student) notFound();

  const view = await practiceService.getSessionView(params.id, student.id);
  if (!view) notFound();
  const { session: s, questions, answers } = view;
  const back = `/student/practice?subject=${s.subjectId}`;

  const header = (
    <PageHeader
      title={s.scopeLabel}
      description={`${s.subject.name} · ${s.mode === "EXAM" ? "Timed exam" : "Practice"}`}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href={back}>Back to practice</Link>
        </Button>
      }
    />
  );

  if (s.status === "IN_PROGRESS") {
    const practiceMode = s.mode === "PRACTICE";
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        {header}
        <PracticeRunner
          sessionId={s.id}
          mode={s.mode}
          title={s.scopeLabel}
          startedAt={s.startedAt.toISOString()}
          durationMinutes={s.durationMinutes}
          questions={questions.map((q) => ({
            id: q.id,
            chapterLabel: `Chapter ${q.chapterNumber}: ${q.chapterTitle}`,
            type: q.type,
            questionText: q.questionText,
            options: q.options,
            marks: q.marks,
            // Answers and explanations reach the browser only in practice mode. An exam never sees them until it is submitted.
            ...(practiceMode ? { correctAnswer: q.correctAnswer, explanation: q.explanation } : {}),
          }))}
        />
      </div>
    );
  }

  const breakdown = await practiceService.getSessionBreakdown(view);
  const minutesTaken = s.submittedAt ? Math.max(1, Math.round((s.submittedAt.getTime() - s.startedAt.getTime()) / 60000)) : null;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {header}
      <PracticeReview
        sessionId={s.id}
        subjectId={s.subjectId}
        scopeLabel={s.scopeLabel}
        mode={s.mode}
        marksObtained={s.marksObtained ?? 0}
        totalMarks={s.totalMarks}
        minutesTaken={minutesTaken}
        passPercent={practiceService.PASS_PERCENT}
        breakdown={breakdown}
        questions={questions.map((q) => ({
          id: q.id,
          chapterNumber: q.chapterNumber,
          chapterTitle: q.chapterTitle,
          type: q.type,
          questionText: q.questionText,
          options: q.options,
          marks: q.marks,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          given: answers[q.id]?.answer ?? "",
          marksAwarded: answers[q.id]?.marksAwarded ?? null,
          selfMarked: !!answers[q.id]?.selfMarked,
        }))}
      />
    </div>
  );
}
