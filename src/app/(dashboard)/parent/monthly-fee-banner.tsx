import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatPKR } from "@/lib/utils";

/** Soft, informational only — per product decision, an unpaid month never blocks class access
 * or attendance marking. This purely surfaces "has this month's fee been paid" so a parent
 * doesn't have to dig through the Payments page to find out. */
export function MonthlyFeeBanner({
  status,
}: {
  status: { effectiveStatus: string; monthLabel: string; installment: { amount: unknown } } | null;
}) {
  if (!status) return null;
  if (status.effectiveStatus === "PAID") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>{status.monthLabel}&apos;s fee is paid — thank you.</span>
      </div>
    );
  }

  const label = status.effectiveStatus === "OVERDUE" ? "overdue" : status.effectiveStatus === "PARTIALLY_PAID" ? "partially paid" : "not yet paid";

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
      <span className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {status.monthLabel}&apos;s fee ({formatPKR(Number(status.installment.amount))}) is {label}.
      </span>
      <Link
        href="/parent/payments"
        className="inline-flex items-center rounded-full bg-cta px-3 py-1 text-xs font-semibold text-cta-foreground shadow-sm transition-colors hover:bg-cta-hover"
      >
        Pay now
      </Link>
    </div>
  );
}
