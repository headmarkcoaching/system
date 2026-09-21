import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { FilterSelect } from "@/components/shared/filter-bar";
import * as engagementService from "@/lib/services/engagement";
import { formatDate } from "@/lib/utils";
import { Activity } from "lucide-react";
import type { EngagementStatus } from "@prisma/client";

const STATUS_OPTIONS = [
  { value: "HIGHLY_ENGAGED", label: "Highly Engaged" },
  { value: "ENGAGED", label: "Engaged" },
  { value: "LOW_ENGAGEMENT", label: "Low Engagement" },
  { value: "INACTIVE", label: "Inactive" },
];

export default async function EngagementDashboardPage({ searchParams }: { searchParams: { status?: string } }) {
  const statusFilter = searchParams.status as EngagementStatus | undefined;
  const [filtered, all] = await Promise.all([
    engagementService.listByStatus(statusFilter),
    engagementService.listByStatus(),
  ]);

  const counts = {
    HIGHLY_ENGAGED: all.filter((r) => r.status === "HIGHLY_ENGAGED").length,
    ENGAGED: all.filter((r) => r.status === "ENGAGED").length,
    LOW_ENGAGEMENT: all.filter((r) => r.status === "LOW_ENGAGEMENT").length,
    INACTIVE: all.filter((r) => r.status === "INACTIVE").length,
  };

  const columns: DataTableColumn<(typeof filtered)[number]>[] = [
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
    { key: "batch", header: "Batch", cell: (r) => r.student.batchMemberships[0]?.batch.name ?? "—" },
    { key: "score", header: "Score", cell: (r) => `${Math.round(r.score)}/100` },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "updated", header: "Last Calculated", cell: (r) => formatDate(r.calculatedAt), hideOnMobile: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Engagement Dashboard" description="Composite engagement score per student, from attendance, homework, logins, tests, and participation." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Highly Engaged" value={counts.HIGHLY_ENGAGED} icon={Activity} tone="success" />
        <StatCard label="Engaged" value={counts.ENGAGED} icon={Activity} />
        <StatCard label="Low Engagement" value={counts.LOW_ENGAGEMENT} icon={Activity} tone="warning" />
        <StatCard label="Inactive" value={counts.INACTIVE} icon={Activity} tone="destructive" />
      </div>

      <div className="flex justify-end">
        <FilterSelect paramKey="status" placeholder="All Statuses" defaultValue={searchParams.status} options={STATUS_OPTIONS} />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(r) => r.studentId}
        rowHref={(r) => `/students/${r.studentId}`}
        emptyTitle="No engagement scores yet"
        emptyDescription="Scores are calculated by the daily engagement-scores job, or manually from a student's Engagement tab."
      />
    </div>
  );
}
