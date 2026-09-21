import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as studentService from "@/lib/services/students";
import * as examPrepService from "@/lib/services/exam-prep";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ExamPrepView } from "./exam-prep-view";

export default async function ExamPrepPage({ searchParams }: { searchParams: { test?: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await studentService.getStudentByUserId(session.user.id);
  if (!student) return <EmptyState title="Student profile not found" />;

  const data = await examPrepService.getExamPrepData(student.id, searchParams.test);

  if (!data.targetTest) {
    return (
      <div className="space-y-6">
        <PageHeader title="Exam Prep Mode" description="Countdown, weak chapters, and study progress for your next test." />
        <EmptyState title="No upcoming test scheduled" description="Exam Prep Mode appears once a test is scheduled for one of your batches." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Exam Prep Mode" description="Countdown, weak chapters, and study progress for your next test." />
      <ExamPrepView data={data} />
    </div>
  );
}
