import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { FilterSelect } from "@/components/shared/filter-bar";
import * as riskService from "@/lib/services/predictive-risk";
import { formatDate } from "@/lib/utils";
import { ShieldAlert } from "lucide-react";
import type { RiskLevel } from "@prisma/client";

const RISK_OPTIONS = [
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MODERATE", label: "Moderate" },
  { value: "LOW", label: "Low" },
];

export default async function PredictiveRiskPage({ searchParams }: { searchParams: { level?: string } }) {
  const levelFilter = searchParams.level as RiskLevel | undefined;
  const [filtered, all] = await Promise.all([riskService.listByRiskLevel(levelFilter), riskService.listByRiskLevel()]);

  const counts = {
    CRITICAL: all.filter((r) => r.riskLevel === "CRITICAL").length,
    HIGH: all.filter((r) => r.riskLevel === "HIGH").length,
    MODERATE: all.filter((r) => r.riskLevel === "MODERATE").length,
    LOW: all.filter((r) => r.riskLevel === "LOW").length,
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
    { key: "level", header: "Risk Level", cell: (r) => <StatusBadge status={r.riskLevel} /> },
    { key: "signals", header: "Signals", cell: (r) => (r.signals as string[])[0] ?? "—", hideOnMobile: true },
    { key: "updated", header: "Last Calculated", cell: (r) => formatDate(r.calculatedAt), hideOnMobile: true },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Predictive Risk"
        description="Transparent, rule-based reading of declining trends (attendance, homework, tests, engagement, login recency) — distinct from At-Risk's single-snapshot threshold breach."
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Critical" value={counts.CRITICAL} icon={ShieldAlert} tone="destructive" />
        <StatCard label="High" value={counts.HIGH} icon={ShieldAlert} tone="warning" />
        <StatCard label="Moderate" value={counts.MODERATE} icon={ShieldAlert} />
        <StatCard label="Low" value={counts.LOW} icon={ShieldAlert} tone="success" />
      </div>

      <div className="flex justify-end">
        <FilterSelect paramKey="level" placeholder="All Risk Levels" defaultValue={searchParams.level} options={RISK_OPTIONS} />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(r) => r.studentId}
        rowHref={(r) => `/students/${r.studentId}`}
        emptyTitle="No predictive risk scores yet"
        emptyDescription="Scores are calculated by the daily predictive-risk-scores job, or manually from a student's Engagement tab."
      />
    </div>
  );
}
