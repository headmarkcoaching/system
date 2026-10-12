import Link from "next/link";
import { MessageCircleQuestion, AlarmClock, CheckCircle2, Timer } from "lucide-react";
import { requireRoleSession } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/permissions";
import * as doubtService from "@/lib/services/doubts";
import * as teacherMessageService from "@/lib/services/teacher-messages";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DoubtFilterTabs, DoubtTable } from "@/components/shared/doubt-table";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { formatDate } from "@/lib/utils";
import type { DoubtStatus } from "@prisma/client";

const VALID = ["OPEN", "ANSWERED", "RESOLVED", "ALL"];

function formatHours(h: number | null) {
  if (h === null) return "No data yet";
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 24) return `${h.toFixed(1)} hours`;
  return `${(h / 24).toFixed(1)} days`;
}

export default async function AdminDoubtsPage(props: { searchParams: Promise<{ status?: string }> }) {
  const searchParams = await props.searchParams;
  await requireRoleSession(STAFF_ROLES);
  const filter = VALID.includes(searchParams.status ?? "") ? (searchParams.status as string) : "OPEN";

  const [stats, doubts, threads] = await Promise.all([
    doubtService.getDoubtStats(),
    doubtService.listAllDoubts(filter === "ALL" ? undefined : (filter as DoubtStatus)),
    teacherMessageService.listAllThreads(),
  ]);

  const threadColumns: DataTableColumn<(typeof threads)[number]>[] = [
    { key: "subject", header: "Subject", cell: (r) => <span className="font-medium">{r.subject}</span> },
    { key: "teacher", header: "Teacher", cell: (r) => r.teacher.fullName },
    { key: "student", header: "About", cell: (r) => r.student.fullName, hideOnMobile: true },
    { key: "from", header: "Started by", cell: (r) => r.startedBy.name, hideOnMobile: true },
    { key: "last", header: "Last message", cell: (r) => formatDate(r.lastMessageAt) },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Doubts and Messages"
        description="How quickly students get answers, and the private conversations between families and teachers."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open doubts" value={stats.open} icon={MessageCircleQuestion} />
        <StatCard label="Overdue (over 24h)" value={stats.overdue} icon={AlarmClock} tone={stats.overdue > 0 ? "destructive" : "success"} />
        <StatCard label="Answered, last 30 days" value={stats.answeredLast30Days} icon={CheckCircle2} tone="success" />
        <StatCard label="Typical first reply" value={formatHours(stats.medianFirstResponseHours)} icon={Timer} hint="Median, last 30 days" />
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Student doubts</h2>
        <DoubtFilterTabs basePath="/admin/doubts" active={filter} />
        <DoubtTable doubts={doubts} showBatch />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-semibold">Teacher messages</h2>
          <p className="text-sm text-muted-foreground">Read-only. Families and teachers know the academy can see these conversations.</p>
        </div>
        <DataTable columns={threadColumns} data={threads} rowKey={(r) => r.id} rowHref={(r) => `/messages/${r.id}`} emptyTitle="No messages yet" />
        <p className="text-xs text-muted-foreground">
          Parents who need the office should use <Link href="/admin/support" className="text-primary hover:underline">support tickets</Link>.
        </p>
      </section>
    </div>
  );
}
