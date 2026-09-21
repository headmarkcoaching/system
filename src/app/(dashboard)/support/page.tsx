import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import * as supportService from "@/lib/services/support";
import { RaiseTicketButton } from "./raise-ticket-button";

const CATEGORY_LABELS: Record<string, string> = {
  ACADEMIC: "Academic",
  TECHNICAL: "Technical",
  PAYMENT: "Payment",
  ACCOUNT: "Account",
  OTHER: "Other",
};

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tickets = await supportService.listTicketsForUser(session.user.id);

  const columns: DataTableColumn<(typeof tickets)[number]>[] = [
    { key: "subject", header: "Subject", cell: (r) => <span className="font-medium">{r.subject}</span> },
    { key: "category", header: "Category", cell: (r) => <Badge variant="outline">{CATEGORY_LABELS[r.category]}</Badge> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "created", header: "Raised", cell: (r) => formatDate(r.createdAt), hideOnMobile: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Support" description="Raise a ticket for academic, technical, payment, or account issues." actions={<RaiseTicketButton />} />
      <DataTable columns={columns} data={tickets} rowKey={(r) => r.id} rowHref={(r) => `/support/${r.id}`} emptyTitle="No support tickets yet" />
    </div>
  );
}
