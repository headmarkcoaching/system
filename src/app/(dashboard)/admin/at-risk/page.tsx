import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import * as performanceService from "@/lib/services/performance";
import * as staffService from "@/lib/services/staff";
import { formatDate } from "@/lib/utils";
import { CreateInterventionButton } from "./create-intervention-button";

export default async function AtRiskStudentsPage() {
  const [atRiskStudents, staffOptions] = await Promise.all([
    performanceService.listAtRiskStudents(),
    staffService.listStaffForPicker(),
  ]);

  const columns: DataTableColumn<(typeof atRiskStudents)[number]>[] = [
    {
      key: "student",
      header: "Student",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.student.fullName}</p>
          <p className="text-xs text-muted-foreground">{r.student.studentCode}</p>
        </div>
      ),
    },
    { key: "batch", header: "Batch", cell: (r) => r.batch?.name ?? "—" },
    { key: "score", header: "Score", cell: (r) => <Badge variant="destructive">{r.overallScore}/100</Badge> },
    { key: "reason", header: "Reason", cell: (r) => r.reasons.join(", ") },
    { key: "action", header: "Suggested Action", cell: (r) => <Badge variant="warning">{r.suggestedAction}</Badge> },
    { key: "updated", header: "Last Updated", cell: (r) => formatDate(r.calculatedAt), hideOnMobile: true },
    {
      key: "intervention",
      header: "",
      cell: (r) => <CreateInterventionButton studentId={r.student.id} studentName={r.student.fullName} staffOptions={staffOptions} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="At-Risk Students"
        description={`${atRiskStudents.length} student${atRiskStudents.length === 1 ? "" : "s"} currently flagged, based on the rules in Settings → Performance Rules.`}
      />
      <DataTable
        columns={columns}
        data={atRiskStudents}
        rowKey={(r) => r.student.id}
        rowHref={(r) => `/students/${r.student.id}`}
        emptyTitle="No students currently at risk"
        emptyDescription="Performance is recalculated per-student from a batch or the student's profile. Nobody has crossed a threshold yet."
      />
      <p className="text-xs text-muted-foreground">
        Adjust the thresholds in{" "}
        <Link href="/admin/settings/performance" className="underline">
          Settings → Performance Rules
        </Link>
        .
      </p>
    </div>
  );
}
