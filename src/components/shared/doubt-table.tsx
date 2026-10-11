import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { hoursWaiting, isOverdue } from "@/lib/services/doubts";
import type { DoubtStatus } from "@prisma/client";

interface DoubtRow {
  id: string;
  title: string;
  chapter: string | null;
  status: DoubtStatus;
  lastActivityAt: Date;
  student: { fullName: string };
  subject: { name: string };
  batch: { name: string };
}

function waitingLabel(hours: number) {
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export const DOUBT_FILTERS: { value: DoubtStatus | "ALL"; label: string }[] = [
  { value: "OPEN", label: "Needs reply" },
  { value: "ANSWERED", label: "Answered" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "ALL", label: "All" },
];

/** Status filter links that keep the page server-rendered (the filter lives in the URL). */
export function DoubtFilterTabs({ basePath, active }: { basePath: string; active: string }) {
  return (
    <div role="tablist" aria-label="Filter doubts" className="flex flex-wrap gap-1.5">
      {DOUBT_FILTERS.map((f) => (
        <Link
          key={f.value}
          role="tab"
          aria-selected={active === f.value}
          href={`${basePath}?status=${f.value}`}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            active === f.value ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-accent"
          )}
        >
          {f.label}
        </Link>
      ))}
    </div>
  );
}

export function DoubtTable({ doubts, showBatch }: { doubts: DoubtRow[]; showBatch?: boolean }) {
  const columns: DataTableColumn<DoubtRow>[] = [
    {
      key: "title",
      header: "Doubt",
      cell: (r) => (
        <span className="block min-w-0">
          <span className="block font-medium">{r.title}</span>
          {showBatch && <span className="block text-xs text-muted-foreground">{r.batch.name}</span>}
        </span>
      ),
    },
    { key: "student", header: "Student", cell: (r) => r.student.fullName },
    { key: "subject", header: "Subject", cell: (r) => [r.subject.name, r.chapter].filter(Boolean).join(" · "), hideOnMobile: true },
    {
      key: "waiting",
      header: "Waiting",
      cell: (r) =>
        r.status === "OPEN" ? (
          <span className="inline-flex items-center gap-2">
            {waitingLabel(hoursWaiting(r.lastActivityAt))}
            {isOverdue(r) && <Badge variant="destructive">Overdue</Badge>}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  ];
  return <DataTable columns={columns} data={doubts} rowKey={(r) => r.id} rowHref={(r) => `/doubts/${r.id}`} emptyTitle="No doubts here" />;
}
