import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircleQuestion, Plus } from "lucide-react";
import { auth } from "@/lib/auth";
import * as studentService from "@/lib/services/students";
import * as doubtService from "@/lib/services/doubts";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

export default async function StudentDoubtsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await studentService.getStudentByUserId(session.user.id);
  const doubts = student ? await doubtService.listDoubtsForStudent(student.id) : [];

  const columns: DataTableColumn<(typeof doubts)[number]>[] = [
    { key: "title", header: "Doubt", cell: (r) => <span className="font-medium">{r.title}</span> },
    { key: "subject", header: "Subject", cell: (r) => [r.subject.name, r.chapter].filter(Boolean).join(" · "), hideOnMobile: true },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "activity", header: "Last activity", cell: (r) => formatDate(r.lastActivityAt), hideOnMobile: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ask a Doubt"
        description="Stuck on something? Post your question and your teacher will answer here. You can add a photo of the problem."
        actions={
          <Button asChild size="sm">
            <Link href="/student/doubts/new">
              <Plus className="mr-1.5 h-4 w-4" /> Ask a Doubt
            </Link>
          </Button>
        }
      />
      {doubts.length === 0 ? (
        <EmptyState
          icon={MessageCircleQuestion}
          title="No doubts yet"
          description="When a lecture or chapter doesn't make sense, ask here instead of staying stuck."
        />
      ) : (
        <DataTable columns={columns} data={doubts} rowKey={(r) => r.id} rowHref={(r) => `/doubts/${r.id}`} />
      )}
    </div>
  );
}
