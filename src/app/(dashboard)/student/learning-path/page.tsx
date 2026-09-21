import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as studentService from "@/lib/services/students";
import * as learningPathService from "@/lib/services/learning-path";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { LearningPathView } from "./learning-path-view";

export default async function StudentLearningPathPage({ searchParams }: { searchParams: { subject?: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await studentService.getStudentByUserId(session.user.id);
  if (!student) return <EmptyState title="Student profile not found" />;

  const subjects = await studentService.listSubjectsForStudent(student.id);
  if (subjects.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Learning Path" description="Lecture → Notes → Homework → Quiz, tracked chapter by chapter." />
        <EmptyState title="No subjects assigned yet" />
      </div>
    );
  }

  const selectedSubject = subjects.find((s) => s.id === searchParams.subject) ?? subjects[0];
  const chapters = await learningPathService.getLearningPath(student.id, selectedSubject.id);
  const overallPercent = learningPathService.overallCompletionPercent(chapters);

  return (
    <div className="space-y-6">
      <PageHeader title="Learning Path" description="Lecture → Notes → Homework → Quiz, tracked chapter by chapter." />
      <LearningPathView subjects={subjects} selectedSubjectId={selectedSubject.id} chapters={chapters} overallPercent={overallPercent} />
    </div>
  );
}
