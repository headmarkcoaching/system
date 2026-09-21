import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils";
import { Share2, UserPlus, GraduationCap, Trophy, Gift } from "lucide-react";
import * as referralsService from "@/lib/services/referrals";
import { GrantRewardButton } from "./grant-reward-button";

export default async function ReferralsPage() {
  const [stats, referrals] = await Promise.all([referralsService.referralDashboardStats(), referralsService.listAllReferrals()]);

  const columns: DataTableColumn<(typeof referrals)[number]>[] = [
    {
      key: "referred",
      header: "Referred",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.referredName}</p>
          <p className="text-xs text-muted-foreground">{r.referredPhone ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "referrer",
      header: "Referred By",
      cell: (r) => r.referrerStudent?.fullName ?? r.referrerParent?.fullName ?? "—",
    },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    { key: "created", header: "Date", cell: (r) => formatDate(r.createdAt), hideOnMobile: true },
    {
      key: "actions",
      header: "",
      cell: (r) =>
        r.status === "ENROLLED" ? <GrantRewardButton referralId={r.id} /> : r.rewards.length > 0 ? <span className="text-xs text-muted-foreground">Rewarded</span> : null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Referrals" description="Track referrals made by students and parents, and reward them once enrolled." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <StatCard label="Total Referrals" value={stats.total} icon={Share2} />
        <StatCard label="Registered" value={stats.registered} icon={UserPlus} />
        <StatCard label="On Trial" value={stats.trials} icon={GraduationCap} />
        <StatCard label="Enrolled" value={stats.enrolled} icon={Trophy} tone="success" />
        <StatCard label="Rewards Granted" value={stats.rewards} icon={Gift} />
      </div>

      <DataTable columns={columns} data={referrals} rowKey={(r) => r.id} emptyTitle="No referrals yet" />
    </div>
  );
}
