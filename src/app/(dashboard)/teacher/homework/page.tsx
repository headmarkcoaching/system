import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import * as staffService from "@/lib/services/staff";
import * as batchService from "@/lib/services/batches";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export default async function TeacherHomeworkPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const teacher = await staffService.getTeacherByUserId(session.user.id);
  const homeworkList = teacher ? await batchService.listHomeworkForTeacher(teacher.id) : [];

  const columns: DataTableColumn<(typeof homeworkList)[number]>[] = [
    { key: "title", header: "Homework", cell: (r) => <span className="font-medium">{r.title}</span> },
    { key: "batch", header: "Batch", cell: (r) => r.batch.name },
    { key: "subject", header: "Subject", cell: (r) => r.subject.name, hideOnMobile: true },
    { key: "due", header: "Due", cell: (r) => formatDate(r.dueDate) },
    {
      key: "progress",
      header: "Progress",
      cell: (r) => {
        const submitted = r.submissions.filter((s) => s.status !== "PENDING").length;
        return (
          <Badge variant={submitted === r.submissions.length ? "success" : "warning"}>
            {submitted}/{r.submissions.length} submitted
          </Badge>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Homework" description="Across all your batches. Open a batch to review and grade submissions." />
      <DataTable
        columns={columns}
        data={homeworkList}
        rowKey={(r) => r.id}
        rowHref={(r) => `/batches/${r.batch.id}?tab=homework`}
        emptyTitle="No homework assigned yet"
      />
      <p className="text-xs text-muted-foreground">
        Tip: create and grade homework from the <Link href="/teacher/batches" className="underline">batch</Link>&apos;s Homework tab.
      </p>
    </div>
  );
}
