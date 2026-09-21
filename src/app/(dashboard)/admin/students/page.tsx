import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar, FilterSelect } from "@/components/shared/filter-bar";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Pagination } from "@/components/shared/pagination";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import * as studentService from "@/lib/services/students";
import * as academicService from "@/lib/services/academic-structure";

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "TRIAL", label: "Trial" },
  { value: "PAYMENT_PENDING", label: "Payment Pending" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ALUMNI", label: "Alumni" },
];

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; level?: string; page?: string };
}) {
  const [levels, { items, total, page, pageSize, totalPages }] = await Promise.all([
    academicService.listAcademicLevels(),
    studentService.listStudents({
      page: Number(searchParams.page ?? 1),
      q: searchParams.q,
      status: searchParams.status,
      academicLevelId: searchParams.level,
    }),
  ]);

  const columns: DataTableColumn<(typeof items)[number]>[] = [
    {
      key: "name",
      header: "Student",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={r.photoUrl ?? undefined} alt={r.fullName} />
            <AvatarFallback className="text-xs">{initials(r.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{r.fullName}</p>
            <p className="text-xs text-muted-foreground">{r.studentCode}</p>
          </div>
        </div>
      ),
    },
    { key: "level", header: "Level", cell: (r) => r.academicLevel.name },
    { key: "batch", header: "Batch", cell: (r) => r.batchMemberships[0]?.batch.name ?? "—" },
    { key: "phone", header: "Phone", cell: (r) => r.phone ?? "—", hideOnMobile: true },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description={`${total} student${total === 1 ? "" : "s"} in the academy`}
        actions={
          <Button asChild>
            <Link href="/admin/students/new">
              <Plus className="mr-1.5 h-4 w-4" /> Add Student
            </Link>
          </Button>
        }
      />

      <FilterBar searchPlaceholder="Search by name, code or phone…" defaultQuery={searchParams.q}>
        <FilterSelect paramKey="status" placeholder="All Statuses" defaultValue={searchParams.status} options={STATUS_OPTIONS} />
        <FilterSelect
          paramKey="level"
          placeholder="All Levels"
          defaultValue={searchParams.level}
          options={levels.map((l) => ({ value: l.id, label: l.name }))}
        />
      </FilterBar>

      <DataTable
        columns={columns}
        data={items}
        rowKey={(r) => r.id}
        rowHref={(r) => `/students/${r.id}`}
        emptyTitle="No students found"
        emptyDescription="Try adjusting your filters, or add the first student to the academy."
      />

      <Pagination page={page} totalPages={totalPages} totalItems={total} pageSize={pageSize} basePath="/admin/students" searchParams={searchParams} />
    </div>
  );
}
