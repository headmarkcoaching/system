import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { FilterBar, FilterSelect } from "@/components/shared/filter-bar";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Pagination } from "@/components/shared/pagination";
import { Wallet, AlertTriangle, TrendingUp } from "lucide-react";
import * as paymentsService from "@/lib/services/payments";
import * as academicService from "@/lib/services/academic-structure";
import * as batchService from "@/lib/services/batches";
import { formatDate, formatPKR } from "@/lib/utils";
import { ReviewQueue } from "./review-queue";
import { SendReminderButton } from "./send-reminder-button";
import { SendBulkReminderButton } from "./send-bulk-reminder-button";

const STATUS_OPTIONS = [
  { value: "OVERDUE", label: "Overdue" },
  { value: "PENDING", label: "Pending" },
  { value: "PAID_UP", label: "Paid Up" },
  { value: "NO_PLAN", label: "No Plan" },
];

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: { q?: string; level?: string; batch?: string; status?: string; page?: string };
}) {
  const [summary, { items, total, page, pageSize, totalPages }, recentPayments, pendingReview, levels, batches, overdueCount] = await Promise.all([
    paymentsService.paymentsSummary(),
    paymentsService.listStudentsPaymentOverview({
      page: Number(searchParams.page ?? 1),
      q: searchParams.q,
      academicLevelId: searchParams.level,
      batchId: searchParams.batch,
      status: searchParams.status,
    }),
    paymentsService.listRecentPayments(),
    paymentsService.listPendingReviewPayments(),
    academicService.listAcademicLevels(),
    batchService.listBatchesForPicker(),
    paymentsService.countOverdueStudents(),
  ]);

  const studentColumns: DataTableColumn<(typeof items)[number]>[] = [
    {
      key: "student",
      header: "Student",
      cell: (r) => (
        <div>
          <p className="font-medium">{r.fullName}</p>
          <p className="text-xs text-muted-foreground">{r.studentCode}</p>
        </div>
      ),
    },
    { key: "class", header: "Class", cell: (r) => r.academicLevel ?? "—" },
    { key: "batch", header: "Batch", cell: (r) => r.batch ?? "—", hideOnMobile: true },
    { key: "fee", header: "Total Fee", cell: (r) => (r.planId ? formatPKR(r.totalFee) : "—"), hideOnMobile: true },
    { key: "paid", header: "Paid", cell: (r) => (r.planId ? formatPKR(r.totalPaid) : "—") },
    {
      key: "next",
      header: "Next / Overdue",
      cell: (r) =>
        r.nextDue ? (
          <span>
            {formatPKR(r.nextDue.amount)} · {formatDate(r.nextDue.dueDate)}
          </span>
        ) : (
          "—"
        ),
    },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: "action",
      header: "",
      cell: (r) => (r.status === "OVERDUE" || r.status === "PENDING") && r.nextDue ? <SendReminderButton installmentId={r.nextDue.installmentId} /> : null,
    },
  ];

  const paymentColumns: DataTableColumn<(typeof recentPayments)[number]>[] = [
    { key: "student", header: "Student", cell: (r) => r.student.fullName },
    { key: "amount", header: "Amount", cell: (r) => formatPKR(r.amount.toString()) },
    { key: "method", header: "Method", cell: (r) => r.method.replace("_", " ") },
    { key: "date", header: "Date", cell: (r) => (r.paidAt ? formatDate(r.paidAt) : "—") },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" description="Every student's fee status, plus pending reviews and recent collections." />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Pending Amount" value={formatPKR(summary.pendingAmount)} icon={Wallet} tone="warning" />
        <StatCard label="Overdue Amount" value={formatPKR(summary.overdueAmount)} icon={AlertTriangle} tone="destructive" />
        <StatCard label="Collected This Month" value={formatPKR(summary.collectedThisMonth)} icon={TrendingUp} tone="success" />
      </div>

      <ReviewQueue payments={pendingReview} />

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Students</h3>
          <SendBulkReminderButton overdueCount={overdueCount} />
        </div>
        <div className="mb-3">
          <FilterBar searchPlaceholder="Search by student name…" defaultQuery={searchParams.q}>
            <FilterSelect paramKey="level" placeholder="All Classes" defaultValue={searchParams.level} options={levels.filter((l) => l.isActive).map((l) => ({ value: l.id, label: l.name }))} />
            <FilterSelect paramKey="batch" placeholder="All Batches" defaultValue={searchParams.batch} options={batches.map((b) => ({ value: b.id, label: b.name }))} />
            <FilterSelect paramKey="status" placeholder="All Statuses" defaultValue={searchParams.status} options={STATUS_OPTIONS} />
          </FilterBar>
        </div>
        <DataTable
          columns={studentColumns}
          data={items}
          rowKey={(r) => r.studentId}
          rowHref={(r) => `/students/${r.studentId}?tab=payments`}
          emptyTitle="No students match these filters"
        />
        <Pagination page={page} totalPages={totalPages} totalItems={total} pageSize={pageSize} basePath="/admin/payments" searchParams={searchParams} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Recent Payments</h3>
        <DataTable columns={paymentColumns} data={recentPayments} rowKey={(r) => r.id} emptyTitle="No payments recorded yet" />
      </div>
    </div>
  );
}
