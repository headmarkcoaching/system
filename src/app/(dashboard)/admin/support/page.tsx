import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { FilterSelect } from "@/components/shared/filter-bar";
import { formatDate } from "@/lib/utils";
import * as supportService from "@/lib/services/support";
import type { SupportStatus, SupportCategory, SupportPriority } from "@prisma/client";

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "WAITING_FOR_USER", label: "Waiting for User" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];
const CATEGORY_OPTIONS = [
  { value: "ACADEMIC", label: "Academic" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "PAYMENT", label: "Payment" },
  { value: "ACCOUNT", label: "Account" },
  { value: "OTHER", label: "Other" },
];
const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export default async function AdminSupportPage({ searchParams }: { searchParams: { status?: string; category?: string; priority?: string } }) {
  const tickets = await supportService.listAllTickets({
    status: searchParams.status as SupportStatus | undefined,
    category: searchParams.category as SupportCategory | undefined,
    priority: searchParams.priority as SupportPriority | undefined,
  });

  const columns: DataTableColumn<(typeof tickets)[number]>[] = [
    {
      key: "subject",
      header: "Subject",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.subject}</p>
          <p className="text-xs text-muted-foreground">{r.raisedBy.name}</p>
        </div>
      ),
    },
    { key: "category", header: "Category", cell: (r) => <Badge variant="outline">{CATEGORY_OPTIONS.find((o) => o.value === r.category)?.label}</Badge> },
    { key: "priority", header: "Priority", cell: (r) => <StatusBadge status={r.priority} /> },
    { key: "assigned", header: "Assigned To", cell: (r) => r.assignedTo?.name ?? "Unassigned", hideOnMobile: true },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "created", header: "Raised", cell: (r) => formatDate(r.createdAt), hideOnMobile: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Support Tickets" description={`${tickets.length} ticket${tickets.length === 1 ? "" : "s"}. Triage, assign, and respond.`} />

      <div className="flex flex-wrap gap-2">
        <FilterSelect paramKey="status" placeholder="All Statuses" defaultValue={searchParams.status} options={STATUS_OPTIONS} />
        <FilterSelect paramKey="category" placeholder="All Categories" defaultValue={searchParams.category} options={CATEGORY_OPTIONS} />
        <FilterSelect paramKey="priority" placeholder="All Priorities" defaultValue={searchParams.priority} options={PRIORITY_OPTIONS} />
      </div>

      <DataTable columns={columns} data={tickets} rowKey={(r) => r.id} rowHref={(r) => `/support/${r.id}`} emptyTitle="No support tickets" />
    </div>
  );
}
