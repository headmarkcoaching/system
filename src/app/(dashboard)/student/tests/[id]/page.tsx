import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import * as studentService from "@/lib/services/students";
import * as testService from "@/lib/services/tests";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { StartTestButton } from "./start-button";
import { TakeTestForm } from "./take-test-form";

export default async function StudentTestPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "STUDENT") redirect("/");

  const student = await studentService.getStudentByUserId(session.user.id);
  if (!student) notFound();

  const enrolled = await db.batchStudent.findFirst({ where: { studentId: student.id, batch: { tests: { some: { id: params.id } } } } });
  if (!enrolled) redirect("/student/tests");

  const { test, attempt, result } = await testService.getTestForTaking(params.id, student.id);

  const now = new Date();
  const inWindow = test.status === "ACTIVE" && now >= test.startDate && now <= test.endDate;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {!attempt && <PageHeader title={test.name} description={`${test.subject.name} · ${test.batch.name}`} />}

      {result?.gradedAt ? (
        <ResultView
          test={test}
          result={result}
          questions={test.questions}
          answers={(attempt?.answers as unknown as Record<string, { answer: string; marksAwarded: number | null }>) ?? {}}
        />
      ) : attempt?.submittedAt ? (
        <EmptyState title="Submitted — awaiting grading" description="Your teacher will grade the subjective questions soon. Check back later for your final score." />
      ) : attempt ? (
        <TakeTestForm
          testId={test.id}
          attemptId={attempt.id}
          title={test.name}
          startedAt={attempt.startedAt.toISOString()}
          durationMinutes={test.durationMinutes}
          questions={test.questions.map((q) => ({
            id: q.id,
            type: q.type,
            questionText: q.questionText,
            options: Array.isArray(q.options) ? (q.options as string[]) : null,
            marks: q.marks,
          }))}
        />
      ) : inWindow ? (
        <Card>
          <CardContent className="space-y-4 p-6 text-center">
            <div>
              <p className="text-lg font-semibold">{test.name}</p>
              <p className="text-sm text-muted-foreground">
                {test.questions.length} questions · {test.totalMarks} marks · {test.durationMinutes} minutes
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Once you start, a {test.durationMinutes}-minute timer begins and the test submits automatically when it runs out. Make sure you&apos;re ready before starting.
            </p>
            <StartTestButton testId={test.id} />
          </CardContent>
        </Card>
      ) : now < test.startDate ? (
        <EmptyState
          title="This test hasn't opened yet"
          description={`Opens ${formatDate(test.startDate)} at ${test.startDate.toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" })}.`}
        />
      ) : (
        <EmptyState title="This test window has closed" description="You did not attempt this test before it closed." />
      )}
    </div>
  );
}

interface ReviewQuestion {
  id: string;
  type: string;
  questionText: string;
  options: unknown;
  correctAnswer: string | null;
  marks: number;
}

function ResultView({
  test,
  result,
  questions,
  answers,
}: {
  test: { name: string; subject: { name: string }; batch: { name: string } };
  result: { marksObtained: number; totalMarks: number; gradedAt: Date | null };
  questions: ReviewQuestion[];
  answers: Record<string, { answer: string; marksAwarded: number | null }>;
}) {
  const percent = Math.round((result.marksObtained / result.totalMarks) * 100);
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {test.subject.name} · {test.batch.name}
          </p>
          <p className="text-lg font-semibold">{test.name}</p>
          <p className="text-4xl font-bold">
            {result.marksObtained} <span className="text-lg text-muted-foreground">/ {result.totalMarks}</span>
          </p>
          <Badge variant={percent >= 40 ? "success" : "destructive"} className="text-sm">
            {percent}%
          </Badge>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Your Answers — for exam prep</h3>
        {questions.map((q, idx) => {
          const given = answers[q.id];
          const isObjective = q.type === "MCQ" || q.type === "NUMERICAL";
          const isCorrect = isObjective && given && q.correctAnswer != null && given.answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
          const options = Array.isArray(q.options) ? (q.options as string[]) : null;

          return (
            <Card key={q.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">
                    {idx + 1}. {q.questionText}
                  </p>
                  <Badge variant={isObjective ? (isCorrect ? "success" : "destructive") : "secondary"} className="shrink-0">
                    {given?.marksAwarded ?? 0} / {q.marks}
                  </Badge>
                </div>

                {options && (
                  <ul className="space-y-1 text-sm">
                    {options.map((opt) => {
                      const isGiven = given?.answer === opt;
                      const isRight = q.correctAnswer === opt;
                      return (
                        <li
                          key={opt}
                          className={
                            isRight
                              ? "rounded-md border border-success/40 bg-success/10 px-2 py-1 text-success"
                              : isGiven
                                ? "rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-destructive"
                                : "px-2 py-1 text-muted-foreground"
                          }
                        >
                          {opt}
                          {isGiven && " — your answer"}
                          {isRight && !isGiven && " — correct answer"}
                        </li>
                      );
                    })}
                  </ul>
                )}

                {!options && (
                  <div className="space-y-1 text-sm">
                    <p>
                      <span className="text-muted-foreground">Your answer: </span>
                      {given?.answer || "— not answered —"}
                    </p>
                    {isObjective && !isCorrect && q.correctAnswer && (
                      <p>
                        <span className="text-muted-foreground">Correct answer: </span>
                        <span className="text-success">{q.correctAnswer}</span>
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
