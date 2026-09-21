import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as studentService from "@/lib/services/students";
import * as batchService from "@/lib/services/batches";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { WeeklyTimetableGrid } from "@/components/shared/weekly-timetable-grid";

export default async function StudentTimetablePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await studentService.getStudentByUserId(session.user.id);
  const entries = student ? await batchService.listTimetableForStudent(student.id) : [];

  return (
    <div className="space-y-6">
      <PageHeader title="My Timetable" />
      {entries.length === 0 ? (
        <EmptyState title="No classes scheduled yet" />
      ) : (
        <WeeklyTimetableGrid
          entries={entries.map((e) => ({
            id: e.id,
            dayOfWeek: e.dayOfWeek,
            startTime: e.startTime,
            endTime: e.endTime,
            subjectId: e.subjectId,
            title: e.subject.name,
            subtitle: e.teacher.fullName,
          }))}
        />
      )}
    </div>
  );
}
