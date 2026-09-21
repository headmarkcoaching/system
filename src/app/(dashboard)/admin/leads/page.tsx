import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar, FilterSelect } from "@/components/shared/filter-bar";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Pagination } from "@/components/shared/pagination";
import { Badge } from "@/components/ui/badge";
import * as leadService from "@/lib/services/leads";
import * as staffService from "@/lib/services/staff";
import { formatDate } from "@/lib/utils";

const STAGE_OPTIONS = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "ASSESSMENT_BOOKED", label: "Assessment Booked" },
  { value: "ASSESSMENT_COMPLETED", label: "Assessment Completed" },
  { value: "FREE_TRIAL", label: "Free Trial" },
  { value: "COUNSELLING", label: "Counselling" },
  { value: "PAYMENT_PENDING", label: "Payment Pending" },
  { value: "ENROLLED", label: "Enrolled" },
  { value: "LOST", label: "Lost" },
];

export default async function AdminLeadsPage({ searchParams }: { searchParams: { q?: string; stage?: string; counselor?: string; page?: string } }) {
  const [{ items, total, page, pageSize, totalPages }, counselors, pipeline] = await Promise.all([
    leadService.listLeads({ page: Number(searchParams.page ?? 1), q: searchParams.q, stage: searchParams.stage, counselorId: searchParams.counselor }),
    staffService.listCounselors(),
    leadService.pipelineSummary(),
  ]);

  const columns: DataTableColumn<(typeof items)[number]>[] = [
    {
      key: "student",
      header: "Student",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.studentName}</p>
          <p className="text-xs text-muted-foreground">{r.parentName} · {r.parentPhone}</p>
        </div>
      ),
    },
    { key: "level", header: "Level", cell: (r) => r.academicLevel?.name ?? "—" },
    { key: "counselor", header: "Counselor", cell: (r) => r.assignedCounselor?.fullName ?? "Unassigned", hideOnMobile: true },
    { key: "followup", header: "Next Follow-up", cell: (r) => (r.followups[0] ? formatDate(r.followups[0].dueDate) : "—"), hideOnMobile: true },
    { key: "stage", header: "Stage", cell: (r) => <StatusBadge status={r.stage} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description={`${total} lead${total === 1 ? "" : "s"} in the pipeline`}
        actions={
          <Button asChild>
            <Link href="/leads/new">
              <Plus className="mr-1.5 h-4 w-4" /> Add Lead
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {pipeline.map((p) => (
          <Badge key={p.stage} variant="outline">
            {STAGE_OPTIONS.find((s) => s.value === p.stage)?.label}: {p.count}
          </Badge>
        ))}
      </div>

      <FilterBar searchPlaceholder="Search by student, parent or phone…" defaultQuery={searchParams.q}>
        <FilterSelect paramKey="stage" placeholder="All Stages" defaultValue={searchParams.stage} options={STAGE_OPTIONS} />
        <FilterSelect paramKey="counselor" placeholder="All Counselors" defaultValue={searchParams.counselor} options={counselors.map((c) => ({ value: c.id, label: c.fullName }))} />
      </FilterBar>

      <DataTable columns={columns} data={items} rowKey={(r) => r.id} rowHref={(r) => `/leads/${r.id}`} emptyTitle="No leads found" />

      <Pagination page={page} totalPages={totalPages} totalItems={total} pageSize={pageSize} basePath="/admin/leads" searchParams={searchParams} />
    </div>
  );
}
