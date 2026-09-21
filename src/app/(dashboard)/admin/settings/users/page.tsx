import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { auth } from "@/lib/auth";
import { ROLE_LABELS, SUPER_ADMIN_ONLY } from "@/lib/permissions";
import * as staffService from "@/lib/services/staff";
import { NewUserDialog } from "./new-user-dialog";
import { ActiveToggle } from "./active-toggle";

export default async function UsersPage() {
  const [session, users] = await Promise.all([auth(), staffService.listUsers()]);
  const canCreateSuperAdmin = SUPER_ADMIN_ONLY.includes(session!.user.role);

  const columns: DataTableColumn<(typeof users)[number]>[] = [
    {
      key: "name",
      header: "User",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-muted-foreground">{r.email ?? r.phone}</p>
        </div>
      ),
    },
    { key: "role", header: "Role", cell: (r) => <Badge variant="outline">{ROLE_LABELS[r.roleKey]}</Badge> },
    { key: "lastLogin", header: "Last Login", cell: (r) => (r.lastLoginAt ? new Date(r.lastLoginAt).toLocaleString("en-PK") : "Never"), hideOnMobile: true },
    { key: "active", header: "Active", cell: (r) => <ActiveToggle userId={r.id} isActive={r.isActive} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Staff accounts (Admin, Teacher, Admission Counselor). Student and parent logins are created from their profiles."
        actions={<NewUserDialog canCreateSuperAdmin={canCreateSuperAdmin} />}
      />
      <DataTable columns={columns} data={users} rowKey={(r) => r.id} emptyTitle="No users yet" />
    </div>
  );
}
