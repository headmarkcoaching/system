import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import * as parentService from "@/lib/services/parents";
import * as paymentsService from "@/lib/services/payments";
import * as communicationService from "@/lib/services/communication";
import { STAFF_ROLES } from "@/lib/permissions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { initials, formatDate, formatPKR } from "@/lib/utils";

export default async function ParentProfilePage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isStaff = STAFF_ROLES.includes(session.user.role);
  const isSelf = session.user.role === "PARENT";

  const parent = await parentService.getParentById(params.id);
  if (!parent) notFound();

  if (!isStaff && !(isSelf && parent.userId === session.user.id)) {
    redirect("/parent");
  }

  const childIds = parent.children.map((c) => c.studentId);
  const [paymentPlans, communicationLogs] = await Promise.all([
    Promise.all(childIds.map((id) => paymentsService.listPaymentPlanForStudent(id))),
    Promise.all(childIds.map((id) => communicationService.listForStudent(id))),
  ]);
  const allPayments = paymentPlans.flatMap((plan) => plan?.payments ?? []);
  const allLogs = communicationLogs.flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">{initials(parent.fullName)}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold">{parent.fullName}</h1>
            <p className="text-sm text-muted-foreground">{parent.phone}</p>
          </div>
        </div>
        {isStaff && (
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/parents">Back to Parents</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg border border-border p-4">
          <h3 className="font-semibold">Contact Details</h3>
          <dl className="space-y-1.5 text-sm">
            <Row label="Phone" value={parent.phone} />
            <Row label="WhatsApp" value={parent.whatsapp} />
            <Row label="Email" value={parent.email} />
            <Row label="City" value={parent.city} />
          </dl>
        </div>

        <div className="space-y-3 rounded-lg border border-border p-4">
          <h3 className="font-semibold">Linked Children</h3>
          {parent.children.length === 0 ? (
            <EmptyState title="No children linked yet" className="py-6" />
          ) : (
            <ul className="space-y-2">
              {parent.children.map((rel) => (
                <li key={rel.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <div>
                    <Link href={`/students/${rel.studentId}`} className="font-medium hover:underline">
                      {rel.student.fullName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {rel.student.academicLevel.name} · {rel.relationship}
                    </p>
                  </div>
                  <StatusBadge status={rel.student.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <h3 className="font-semibold">Payment History</h3>
        {allPayments.length === 0 ? (
          <EmptyState title="No payments recorded yet" className="py-6" />
        ) : (
          <ul className="space-y-1.5">
            {allPayments.slice(0, 10).map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span>
                  {formatPKR(Number(p.amount))} · {p.method.replace("_", " ")}
                </span>
                <span className="text-xs text-muted-foreground">{p.paidAt ? formatDate(p.paidAt) : "—"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <h3 className="font-semibold">Communication History</h3>
        {allLogs.length === 0 ? (
          <EmptyState title="No communication logged yet" className="py-6" />
        ) : (
          <ul className="space-y-1.5">
            {allLogs.slice(0, 10).map((log) => (
              <li key={log.id} className="rounded-md border border-border px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{log.type.replace("_", " ")}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</span>
                </div>
                <p className="text-muted-foreground">{log.messageSummary}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value || "—"}</dd>
    </div>
  );
}
