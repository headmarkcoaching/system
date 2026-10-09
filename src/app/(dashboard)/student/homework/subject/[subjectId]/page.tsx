import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import * as studentService from "@/lib/services/students";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ChapterFilterNotice } from "@/components/shared/lecture-bundle";
import { chapterMatches } from "@/lib/lecture-bundle";
import { formatDate } from "@/lib/utils";
import { SubmitHomeworkDialog } from "../../submit-dialog";

export default async function StudentHomeworkSubjectPage({ params, searchParams }: { params: { subjectId: string }; searchParams: { chapter?: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await studentService.getStudentByUserId(session.user.id);
  const homework = student ? await studentService.getStudentHomework(student.id) : [];
  const filtered = homework.filter((h) => h.homework.subject.id === params.subjectId);
  if (filtered.length === 0) notFound();

  const chapter = searchParams.chapter?.trim() || null;
  const shown = chapter ? filtered.filter((h) => chapterMatches(h.homework.chapter, chapter)) : filtered;
  const subjectName = filtered[0].homework.subject.name;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${subjectName} — Homework`}
        description="Submit your work before the due date."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/student/homework">Back to Subjects</Link>
          </Button>
        }
      />
      {chapter && <ChapterFilterNotice chapter={chapter} clearHref={`/student/homework/subject/${params.subjectId}`} />}
      {shown.length === 0 && <EmptyState title="No practice for this chapter yet" description="Your teacher hasn't set homework tagged to this chapter." />}
      <ul className="space-y-2">
        {shown.map((h) => (
          <li key={h.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{h.homework.title}</p>
              <p className="text-xs text-muted-foreground">
                Due {formatDate(h.homework.dueDate)}
                {h.marksObtained != null && ` · ${h.marksObtained}/${h.homework.maxMarks ?? "-"} marks`}
              </p>
              {(h.attachmentUrl || h.attachmentFileId || h.studentComments) && (
                <div className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Your submission:</p>
                  {h.attachmentUrl && (
                    <p>
                      <a href={h.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Your link
                      </a>
                    </p>
                  )}
                  {h.attachmentFileId && (
                    <p>
                      <a href={`/api/files/${h.attachmentFileId}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        Your uploaded file
                      </a>
                    </p>
                  )}
                  {h.studentComments && <p>&ldquo;{h.studentComments}&rdquo;</p>}
                </div>
              )}
              {h.teacherFeedback && <p className="mt-1 text-xs italic text-muted-foreground">&ldquo;{h.teacherFeedback}&rdquo;</p>}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={h.status} />
              {(h.status === "PENDING" || h.status === "RESUBMISSION_REQUESTED") && (
                <SubmitHomeworkDialog homeworkId={h.homeworkId} submissionId={h.id} title={h.homework.title} />
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
