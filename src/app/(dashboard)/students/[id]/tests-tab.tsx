import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils";
import type * as testService from "@/lib/services/tests";

type TestRow = Awaited<ReturnType<typeof testService.listTestsForStudent>>[number];

export function TestsTab({ tests }: { tests: TestRow[] }) {
  const columns: DataTableColumn<TestRow>[] = [
    { key: "name", header: "Test", cell: (r) => r.name },
    { key: "subject", header: "Subject", cell: (r) => r.subject.name },
    { key: "date", header: "Date", cell: (r) => formatDate(r.startDate) },
    {
      key: "marks",
      header: "Marks",
      cell: (r) => (r.result ? `${r.result.marksObtained} / ${r.result.totalMarks}` : "—"),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => {
        if (r.result?.gradedAt) return <StatusBadge status="REVIEWED" />;
        if (r.attempt?.submittedAt) return <StatusBadge status="PENDING_REVIEW" />;
        if (r.attempt) return <StatusBadge status="SUBMITTED" />;
        return <StatusBadge status={r.status} />;
      },
    },
  ];

  return <DataTable columns={columns} data={tests} rowKey={(r) => r.id} emptyTitle="No tests assigned yet" />;
}
