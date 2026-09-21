import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Mail, Wallet, Truck } from "lucide-react";
import * as notesSubscriptionsService from "@/lib/services/notes-subscriptions";
import { formatPKR, formatDate } from "@/lib/utils";
import { ReviewQueue } from "./review-queue";
import { ShipButton } from "./ship-button";

export default async function NotesSubscriptionsPage() {
  const [subscriptions, pendingPayments] = await Promise.all([
    notesSubscriptionsService.listAllSubscriptions(),
    notesSubscriptionsService.listPendingSubscriptionPayments(),
  ]);

  const activeCount = subscriptions.filter((s) => s.status === "ACTIVE").length;
  const monthlyRevenue = activeCount * notesSubscriptionsService.NOTES_PRICE_PER_MONTH;
  const awaitingShipment = subscriptions.filter((s) => s.payments[0]?.status === "PAID" && !s.payments[0]?.shippedAt).length;

  const columns: DataTableColumn<(typeof subscriptions)[number]>[] = [
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
    { key: "subject", header: "Subject", cell: (r) => r.subject.name },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
    {
      key: "delivery",
      header: "Delivery Address",
      cell: (r) => (
        <div className="text-xs">
          <p>
            {r.deliveryName} · {r.deliveryPhone}
          </p>
          <p className="text-muted-foreground">
            {r.deliveryAddress}, {r.deliveryCity}
          </p>
        </div>
      ),
      hideOnMobile: true,
    },
    {
      key: "thisMonth",
      header: "This Month",
      cell: (r) => {
        const latest = r.payments[0];
        if (!latest) return <span className="text-xs text-muted-foreground">Not paid yet</span>;
        return (
          <div className="space-y-1">
            <StatusBadge status={latest.status} />
            {latest.status === "PAID" && !latest.shippedAt && <ShipButton paymentId={latest.id} />}
            {latest.shippedAt && (
              <p className="flex items-center gap-1 text-xs text-success">
                <Truck className="h-3 w-3" /> Shipped {formatDate(latest.shippedAt)}
              </p>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Notes Subscriptions" description="Parents subscribed to have printed notes mailed to them — review payments and mark months as shipped." />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Active Subscriptions" value={activeCount} icon={Mail} />
        <StatCard label="Expected Monthly Revenue" value={formatPKR(monthlyRevenue)} icon={Wallet} tone="success" />
        <StatCard label="Paid — Awaiting Shipment" value={awaitingShipment} icon={Truck} tone="warning" />
      </div>

      <ReviewQueue payments={pendingPayments} />

      <div>
        <h3 className="mb-2 text-sm font-semibold">All Subscriptions</h3>
        <DataTable columns={columns} data={subscriptions} rowKey={(r) => r.id} emptyTitle="No notes subscriptions yet" />
      </div>
    </div>
  );
}
