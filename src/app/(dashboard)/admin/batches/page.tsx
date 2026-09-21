import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar, FilterSelect } from "@/components/shared/filter-bar";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Pagination } from "@/components/shared/pagination";
import * as batchService from "@/lib/services/batches";

const STATUS_OPTIONS = [
  { value: "UPCOMING", label: "Upcoming" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ARCHIVED", label: "Archived" },
];

export default async function BatchesPage({ searchParams }: { searchParams: { q?: string; status?: string; page?: string } }) {
  const { items, total, page, pageSize, totalPages } = await batchService.listBatches({
    page: Number(searchParams.page ?? 1),
    q: searchParams.q,
    status: searchParams.status,
  });

  const columns: DataTableColumn<(typeof items)[number]>[] = [
    { key: "name", header: "Batch", cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "level", header: "Level", cell: (r) => r.academicLevel.name },
    { key: "students", header: "Students", cell: (r) => `${r._count.students} / ${r.maxStudents}` },
    { key: "teachers", header: "Teacher(s)", cell: (r) => r.teachers.map((t) => t.teacher.fullName).join(", ") || "—", hideOnMobile: true },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batches"
        description={`${total} batch${total === 1 ? "" : "es"}`}
        actions={
          <Button asChild>
            <Link href="/admin/batches/new">
              <Plus className="mr-1.5 h-4 w-4" /> Add Batch
            </Link>
          </Button>
        }
      />

      <FilterBar searchPlaceholder="Search batches…" defaultQuery={searchParams.q}>
        <FilterSelect paramKey="status" placeholder="All Statuses" defaultValue={searchParams.status} options={STATUS_OPTIONS} />
      </FilterBar>

      <DataTable columns={columns} data={items} rowKey={(r) => r.id} rowHref={(r) => `/batches/${r.id}`} emptyTitle="No batches found" />

      <Pagination page={page} totalPages={totalPages} totalItems={total} pageSize={pageSize} basePath="/admin/batches" searchParams={searchParams} />
    </div>
  );
}
