import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/shared/filter-bar";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { Pagination } from "@/components/shared/pagination";
import * as parentService from "@/lib/services/parents";

export default async function ParentsPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const { items, total, page, pageSize, totalPages } = await parentService.listParents({ page: Number(searchParams.page ?? 1), q: searchParams.q });

  const columns: DataTableColumn<(typeof items)[number]>[] = [
    { key: "name", header: "Parent", cell: (r) => <span className="font-medium">{r.fullName}</span> },
    { key: "phone", header: "Phone", cell: (r) => r.phone },
    { key: "children", header: "Children", cell: (r) => (r.children.length === 0 ? "—" : r.children.map((c) => c.student.fullName).join(", ")) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parents"
        description={`${total} parent${total === 1 ? "" : "s"} registered`}
        actions={
          <Button asChild>
            <Link href="/admin/parents/new">
              <Plus className="mr-1.5 h-4 w-4" /> Add Parent
            </Link>
          </Button>
        }
      />

      <FilterBar searchPlaceholder="Search by name or phone…" defaultQuery={searchParams.q} />

      <DataTable columns={columns} data={items} rowKey={(r) => r.id} rowHref={(r) => `/parents/${r.id}`} emptyTitle="No parents found" />

      <Pagination page={page} totalPages={totalPages} totalItems={total} pageSize={pageSize} basePath="/admin/parents" searchParams={searchParams} />
    </div>
  );
}
