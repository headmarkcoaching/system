import Link from "next/link";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/utils";
import * as staffService from "@/lib/services/staff";

export default async function TeachersPage() {
  const teachers = await staffService.listTeachers();

  const columns: DataTableColumn<(typeof teachers)[number]>[] = [
    {
      key: "name",
      header: "Teacher",
      cell: (r) => (
        <span className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={r.photoUrl ?? undefined} alt={r.fullName} />
            <AvatarFallback className="text-xs">{initials(r.fullName)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{r.fullName}</span>
        </span>
      ),
    },
    { key: "phone", header: "Phone", cell: (r) => r.phone ?? "—" },
    { key: "email", header: "Email", cell: (r) => r.email ?? "—", hideOnMobile: true },
    { key: "batches", header: "Batches", cell: (r) => r.batchAssignments.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teachers"
        description={`${teachers.length} teacher${teachers.length === 1 ? "" : "s"}`}
        actions={
          <Button asChild>
            <Link href="/admin/settings/users">
              <UserPlus className="mr-1.5 h-4 w-4" /> Add Teacher
            </Link>
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={teachers}
        rowKey={(r) => r.id}
        rowHref={(r) => `/teachers/${r.id}`}
        emptyTitle="No teachers yet"
        emptyDescription="Add a teacher from Settings → Users."
      />
    </div>
  );
}
