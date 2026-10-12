import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as studentService from "@/lib/services/students";
import * as practiceService from "@/lib/services/practice";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SCOPE_DEFAULT_COUNT } from "@/lib/practice";
import { StartForm } from "./start-form";

const SCOPES = ["CHAPTER", "QUARTER", "HALF", "FULL", "PAST_PAPER", "WEAK_AREAS"] as const;
type Scope = (typeof SCOPES)[number];

export default async function StartPracticePage(
  props: { searchParams: Promise<{ subject?: string; scope?: string; target?: string; paper?: string }> }
) {
  const searchParams = await props.searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const student = await studentService.getStudentByUserId(session.user.id);
  if (!student) notFound();

  const scope = SCOPES.find((s) => s === searchParams.scope) as Scope | undefined;
  const subjects = await practiceService.listPracticeSubjects(student.id);
  const subject = subjects.find((s) => s.subjectId === searchParams.subject);
  if (!scope || !subject) notFound();

  const back = `/student/practice?subject=${subject.subjectId}`;
  const header = (title: string, description?: string) => (
    <PageHeader
      title={title}
      description={description}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href={back}>Back</Link>
        </Button>
      }
    />
  );

  // Past paper: a fixed set of questions in the paper's own order.
  if (scope === "PAST_PAPER") {
    const papers = await practiceService.listPastPapersForStudent(student.id, subject.subjectId);
    const paper = papers.find((p) => p.id === searchParams.paper);
    if (!paper) notFound();
    return (
      <div className="space-y-6">
        {header(paper.title, `${subject.subjectName} · ${paper.year}`)}
        <Card className="max-w-2xl">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <p className="text-sm text-muted-foreground">
              {paper._count.questions} question{paper._count.questions === 1 ? "" : "s"} · {paper.totalMarks} marks · {paper.durationMinutes} minutes. This is a timed exam, just like the real paper.
            </p>
            {paper._count.questions === 0 ? (
              <EmptyState title="This paper can't be attempted online yet" description="It has no questions entered. You can still open the paper itself from the past papers list." />
            ) : (
              <StartForm subjectId={subject.subjectId} scope="PAST_PAPER" pastPaperId={paper.id} available={paper._count.questions} defaultCount={paper._count.questions} paperMinutes={paper.durationMinutes} />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const preview = await practiceService.previewScope(student.id, subject.subjectId, scope, searchParams.target);
  if (!preview) {
    return (
      <div className="space-y-6">
        {header("Nothing to practise yet", subject.subjectName)}
        <EmptyState
          title={scope === "WEAK_AREAS" ? "No weak areas found yet" : "That part of the book isn't available"}
          description={scope === "WEAK_AREAS" ? "Practise a chapter or two first. We'll find where you're losing marks and build a paper around it." : undefined}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {header(preview.label, `${subject.subjectName} · ${preview.detail}`)}
      <Card className="max-w-2xl">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <p className="text-sm text-muted-foreground">
            {preview.available} question{preview.available === 1 ? "" : "s"} available across {preview.chapterCount} chapter{preview.chapterCount === 1 ? "" : "s"}. Every chapter is represented, and you&apos;ll see questions you haven&apos;t tried before first.
          </p>
          {preview.available === 0 ? (
            <EmptyState title="No questions here yet" description="Your teacher hasn't added approved questions for this part of the book." />
          ) : (
            <StartForm
              subjectId={subject.subjectId}
              scope={scope}
              chapterId={scope === "CHAPTER" ? searchParams.target : undefined}
              blockKey={scope === "QUARTER" || scope === "HALF" || scope === "FULL" ? searchParams.target : undefined}
              available={preview.available}
              defaultCount={SCOPE_DEFAULT_COUNT[scope as keyof typeof SCOPE_DEFAULT_COUNT]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
