import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { FilterSelect } from "@/components/shared/filter-bar";
import { Pagination } from "@/components/shared/pagination";
import * as interventionsService from "@/lib/services/interventions";
import { formatDate } from "@/lib/utils";
import type { InterventionStatus } from "@prisma/client";

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default async function InterventionsPage({ searchParams }: { searchParams: { status?: string; page?: string } }) {
  const statusFilter = searchParams.status as InterventionStatus | undefined;
  const page = Number(searchParams.page) || 1;
  const { items: interventions, total, totalPages, pageSize } = await interventionsService.listAll({ status: statusFilter, page });

  const columns: DataTableColumn<(typeof interventions)[number]>[] = [
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
    { key: "reason", header: "Reason", cell: (r) => r.reason },
    { key: "staff", header: "Responsible Staff", cell: (r) => r.responsibleStaff.name, hideOnMobile: true },
    { key: "review", header: "Review Date", cell: (r) => formatDate(r.reviewDate), hideOnMobile: true },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Interventions" description={`${total} intervention${total === 1 ? "" : "s"}. Create one from a student's Engagement tab or the At-Risk Students list.`} />

      <div className="flex justify-end">
        <FilterSelect paramKey="status" placeholder="All Statuses" defaultValue={searchParams.status} options={STATUS_OPTIONS} />
      </div>

      <DataTable columns={columns} data={interventions} rowKey={(r) => r.id} rowHref={(r) => `/students/${r.studentId}`} emptyTitle="No interventions yet" />

      <Pagination page={page} totalPages={totalPages} totalItems={total} pageSize={pageSize} basePath="/admin/interventions" searchParams={searchParams} />
    </div>
  );
}
