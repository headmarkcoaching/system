import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import * as studentService from "@/lib/services/students";
import * as testService from "@/lib/services/tests";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChapterFilterNotice } from "@/components/shared/lecture-bundle";
import { chapterMatches } from "@/lib/lecture-bundle";
import { formatDate } from "@/lib/utils";
import { categorizeTest } from "../../categorize";

export default async function StudentTestsSubjectPage({ params, searchParams }: { params: { subjectId: string }; searchParams: { chapter?: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await studentService.getStudentByUserId(session.user.id);
  const tests = student ? await testService.listTestsForStudent(student.id) : [];
  const filtered = tests.filter((t) => t.subject.id === params.subjectId);
  if (filtered.length === 0) notFound();

  const chapter = searchParams.chapter?.trim() || null;
  const shown = chapter ? filtered.filter((t) => chapterMatches(t.chapter, chapter)) : filtered;
  const subjectName = filtered[0].subject.name;
  const grouped = {
    available: shown.filter((t) => categorizeTest(t) === "available"),
    upcoming: shown.filter((t) => categorizeTest(t) === "upcoming"),
    awaiting: shown.filter((t) => categorizeTest(t) === "awaiting"),
    completed: shown.filter((t) => categorizeTest(t) === "completed"),
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${subjectName} — Tests`}
        description="Available tests, upcoming schedule, and your results."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/student/tests">Back to Subjects</Link>
          </Button>
        }
      />

      {chapter && <ChapterFilterNotice chapter={chapter} clearHref={`/student/tests/subject/${params.subjectId}`} />}
      {chapter && shown.length === 0 && <EmptyState title="No tests for this chapter yet" description="Your teacher hasn't set a test tagged to this chapter." />}

      <Section title="Available Now" tests={grouped.available} emptyText="No tests available right now" />
      <Section title="Upcoming" tests={grouped.upcoming} emptyText="No upcoming tests scheduled" />
      <Section title="Awaiting Grading" tests={grouped.awaiting} emptyText="Nothing pending grading" />
      <Section title="Completed" tests={grouped.completed} emptyText="No completed tests yet" showScore />
    </div>
  );
}

function Section({
  title,
  tests,
  emptyText,
  showScore,
}: {
  title: string;
  tests: Awaited<ReturnType<typeof testService.listTestsForStudent>>;
  emptyText: string;
  showScore?: boolean;
}) {
  if (tests.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {tests.length === 0 ? (
        <EmptyState title={emptyText} className="py-6" />
      ) : (
        <ul className="space-y-2">
          {tests.map((t) => (
            <li key={t.id}>
              <Link
                href={`/student/tests/${t.id}`}
                className="flex flex-col gap-2 rounded-lg border border-border p-3 hover:bg-accent sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.totalMarks} marks · {t.durationMinutes} min · {formatDate(t.startDate)}
                  </p>
                </div>
                {showScore && t.result ? (
                  <Badge variant={t.result.marksObtained / t.result.totalMarks >= 0.4 ? "success" : "destructive"}>
                    {t.result.marksObtained} / {t.result.totalMarks}
                  </Badge>
                ) : (
                  <Badge variant="outline">{t.questions.length} questions</Badge>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
