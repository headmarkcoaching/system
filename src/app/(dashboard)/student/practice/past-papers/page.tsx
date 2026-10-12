import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FileText, Timer } from "lucide-react";
import { auth } from "@/lib/auth";
import * as studentService from "@/lib/services/students";
import * as practiceService from "@/lib/services/practice";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const SESSION_LABEL = { ANNUAL: "Annual", SUPPLEMENTARY: "Supplementary", MODEL: "Model paper" } as const;

export default async function PastPapersPage(props: { searchParams: Promise<{ subject?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");
  const student = await studentService.getStudentByUserId(session.user.id);
  if (!student) notFound();

  const subjects = await practiceService.listPracticeSubjects(student.id);
  const subject = subjects.find((s) => s.subjectId === searchParams.subject) ?? subjects.find((s) => s.hasContent) ?? subjects[0];
  if (!subject) notFound();
  const papers = await practiceService.listPastPapersForStudent(student.id, subject.subjectId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Past Papers"
        description={`${subject.subjectName}. Solve a paper against the clock, then review every answer with its explanation.`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/student/practice?subject=${subject.subjectId}`}>Back to practice</Link>
          </Button>
        }
      />

      {subjects.length > 1 && (
        <nav aria-label="Subjects" className="flex flex-wrap gap-1.5">
          {subjects.map((s) => (
            <Link
              key={s.subjectId}
              href={`/student/practice/past-papers?subject=${s.subjectId}`}
              aria-current={s.subjectId === subject.subjectId ? "page" : undefined}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${s.subjectId === subject.subjectId ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-accent"}`}
            >
              {s.subjectName}
            </Link>
          ))}
        </nav>
      )}

      {papers.length === 0 ? (
        <EmptyState icon={FileText} title="No past papers yet" description="Your teacher hasn't published any past papers for this subject." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {papers.map((p) => (
            <li key={p.id}>
              <Card className="h-full">
                <CardContent className="flex h-full flex-col gap-4 p-5 sm:p-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{p.year}</Badge>
                      <Badge variant="outline">{SESSION_LABEL[p.session]}</Badge>
                      {p.board && <Badge variant="outline">{p.board.name}</Badge>}
                    </div>
                    <h2 className="mt-2 font-display text-lg font-bold leading-tight">{p.title}</h2>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span>{p.totalMarks} marks</span>
                      <span className="inline-flex items-center gap-1">
                        <Timer className="h-3.5 w-3.5" aria-hidden="true" /> {p.durationMinutes} min
                      </span>
                      <span>
                        {p._count.questions} question{p._count.questions === 1 ? "" : "s"} online
                      </span>
                    </p>
                  </div>
                  {p.attempts > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Attempted {p.attempts} time{p.attempts === 1 ? "" : "s"}
                      {p.bestPercent !== null ? ` · best ${p.bestPercent}%` : ""}
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap gap-2">
                    {p._count.questions > 0 && (
                      <Button asChild size="sm">
                        <Link href={`/student/practice/start?subject=${subject.subjectId}&scope=PAST_PAPER&paper=${p.id}`}>{p.attempts > 0 ? "Attempt again" : "Attempt online"}</Link>
                      </Button>
                    )}
                    {p.file && (
                      <Button asChild size="sm" variant="outline">
                        <a href={`/api/files/${p.file.id}`} target="_blank" rel="noopener noreferrer">
                          <FileText className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Open paper
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
