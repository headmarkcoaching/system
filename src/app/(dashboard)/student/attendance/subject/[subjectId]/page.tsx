import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import * as studentService from "@/lib/services/students";
import { PageHeader } from "@/components/shared/page-header";
import { ProgressBar } from "@/components/shared/progress-bar";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export default async function StudentAttendanceSubjectPage({ params }: { params: { subjectId: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await studentService.getStudentByUserId(session.user.id);
  const attendance = student ? await studentService.getStudentAttendance(student.id) : [];
  const filtered = attendance.filter((a) => a.liveClass.subject.id === params.subjectId);
  if (filtered.length === 0) notFound();

  const subjectName = filtered[0].liveClass.subject.name;
  const rate = studentService.computeAttendanceRate(filtered);

  const columns: DataTableColumn<(typeof filtered)[number]>[] = [
    { key: "date", header: "Date", cell: (r) => formatDate(r.date) },
    { key: "class", header: "Class", cell: (r) => r.liveClass.title },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <StatusBadge status={r.status} />
          {r.isAutoDetected && (
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground" title="Estimated from your activity during the live class, not manually verified by your teacher">
              Auto (estimated)
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${subjectName} — Attendance`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/student/attendance">Back to Subjects</Link>
          </Button>
        }
      />
      <ProgressBar label="Attendance Rate" value={rate} className="max-w-sm" />
      <DataTable columns={columns} data={filtered} rowKey={(r) => r.id} emptyTitle="No attendance recorded yet" />
    </div>
  );
}
