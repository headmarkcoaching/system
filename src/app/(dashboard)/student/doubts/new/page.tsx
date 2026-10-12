import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as studentService from "@/lib/services/students";
import * as doubtService from "@/lib/services/doubts";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AskDoubtForm } from "./ask-doubt-form";

export default async function NewDoubtPage(
  props: { searchParams: Promise<{ subjectId?: string; chapter?: string; title?: string }> }
) {
  const searchParams = await props.searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await studentService.getStudentByUserId(session.user.id);
  const subjects = student ? await doubtService.listAskableSubjects(student.id) : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ask a Doubt"
        description="Your teacher for that subject will see this and reply here."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/student/doubts">Back to My Doubts</Link>
          </Button>
        }
      />
      {subjects.length === 0 ? (
        <EmptyState title="You're not in a batch yet" description="Once you're enrolled in a batch, you can ask doubts about its subjects here." />
      ) : (
        <Card className="max-w-2xl">
          <CardContent className="p-5 sm:p-6">
            <AskDoubtForm
              subjects={subjects.map((s) => ({ subjectId: s.subjectId, subjectName: s.subjectName }))}
              defaultSubjectId={searchParams.subjectId}
              defaultChapter={searchParams.chapter?.slice(0, 120)}
              defaultTitle={searchParams.title?.slice(0, 140)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
