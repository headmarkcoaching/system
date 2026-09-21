import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as parentService from "@/lib/services/parents";
import * as paymentsService from "@/lib/services/payments";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatPKR } from "@/lib/utils";
import { ChildSwitcher } from "../child-switcher";
import { SubmitPaymentDialog } from "./submit-payment-dialog";

export default async function ParentPaymentsPage({ searchParams }: { searchParams: { child?: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const parent = await parentService.getChildrenForParentUser(session.user.id);
  if (!parent || parent.children.length === 0) {
    return <EmptyState title="No children linked to your account yet" description="Contact the academy to link your child's profile." />;
  }

  const selected = parent.children.find((c) => c.studentId === searchParams.child) ?? parent.children[0];
  const student = selected.student;
  const plan = await paymentsService.listPaymentPlanForStudent(student.id);

  const totalPaid = plan?.payments.filter((p) => p.status === "PAID").reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
  const totalFee = plan ? Number(plan.totalFee) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title="Payments" description={`${student.fullName}'s fee plan, installments, and payment history.`} className="flex-1" />
        <ChildSwitcher options={parent.children.map((c) => ({ id: c.studentId, fullName: c.student.fullName }))} selectedId={student.id} />
      </div>

      {!plan ? (
        <EmptyState title="No payment plan set up yet" description="Contact the academy to set one up." />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Total Fee</p>
              <p className="text-lg font-bold">{formatPKR(totalFee)}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="text-lg font-bold text-success">{formatPKR(totalPaid)}</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p className="text-lg font-bold text-destructive">{formatPKR(Math.max(0, totalFee - totalPaid))}</p>
            </div>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Installments</CardTitle>
              <SubmitPaymentDialog studentId={student.id} installments={plan.installments} />
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5">
                {plan.installments.map((i) => (
                  <li key={i.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <span>
                      #{i.installmentNumber} · {formatPKR(Number(i.amount))} · Due {formatDate(i.dueDate)}
                    </span>
                    <StatusBadge status={i.status === "PENDING" && i.dueDate < new Date() ? "OVERDUE" : i.status} />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {plan.payments.length === 0 ? (
                <EmptyState title="No payments recorded yet" className="py-6" />
              ) : (
                <ul className="space-y-1.5">
                  {plan.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        {formatPKR(Number(p.amount))} · {p.method.replace("_", " ")} {p.referenceNumber && `· ${p.referenceNumber}`}
                        <StatusBadge status={p.status === "PENDING" ? "PENDING_REVIEW" : p.status} />
                      </span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {p.receiptFileId && (
                          <a href={`/api/files/${p.receiptFileId}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            Receipt
                          </a>
                        )}
                        {p.paidAt ? formatDate(p.paidAt) : formatDate(p.createdAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
