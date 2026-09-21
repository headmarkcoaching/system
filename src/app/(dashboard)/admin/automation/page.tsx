import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import * as automationService from "@/lib/services/automation";
import { formatDate } from "@/lib/utils";

function ruleLabel(key: string) {
  return key
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function AutomationLogPage() {
  const logs = await automationService.listLogs();

  const columns: DataTableColumn<(typeof logs)[number]>[] = [
    { key: "rule", header: "Automation", cell: (r) => ruleLabel(r.ruleKey) },
    { key: "who", header: "Student / Lead", cell: (r) => r.student?.fullName ?? r.lead?.studentName ?? "—" },
    { key: "triggeredAt", header: "Triggered At", cell: (r) => formatDate(r.triggeredAt), hideOnMobile: true },
    { key: "action", header: "Action", cell: (r) => <span className="text-sm">{r.action}</span> },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Automation Activity Log" description="Every automatic detection and the action it took — what fired, for whom, and whether it succeeded." />
      <DataTable columns={columns} data={logs} rowKey={(r) => r.id} emptyTitle="No automation activity yet" emptyDescription="Once a rule fires (or a background job runs), it will show up here." />
    </div>
  );
}
