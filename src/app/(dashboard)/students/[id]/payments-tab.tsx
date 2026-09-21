"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EntityDialog, type FieldDef } from "@/components/shared/entity-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, formatPKR } from "@/lib/utils";
import { createPaymentPlanAction, recordPaymentAction } from "./payments-actions";

interface Installment {
  id: string;
  installmentNumber: number;
  amount: unknown;
  dueDate: Date;
  status: string;
}
interface Payment {
  id: string;
  amount: unknown;
  method: string;
  status: string;
  paidAt: Date | null;
  referenceNumber: string | null;
  isSelfReported: boolean;
  receiptFileId: string | null;
}
interface Plan {
  id: string;
  totalFee: unknown;
  installments: Installment[];
  payments: Payment[];
}

const METHOD_OPTIONS = [
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "RAAST", label: "Raast" },
  { value: "EASYPAISA", label: "Easypaisa" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "CASH", label: "Cash" },
  { value: "OTHER", label: "Other" },
];

export function PaymentsTab({ studentId, plan, canManage }: { studentId: string; plan: Plan | null; canManage: boolean }) {
  const totalPaid = plan?.payments.filter((p) => p.status === "PAID").reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
  const totalFee = plan ? Number(plan.totalFee) : 0;

  if (!plan) {
    return (
      <div className="space-y-4">
        {canManage ? (
          <CreatePlanDialog studentId={studentId} />
        ) : (
          <EmptyState title="No payment plan set up yet" />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Installments</h3>
          {canManage && <RecordPaymentDialog studentId={studentId} plan={plan} />}
        </div>
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
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Payment History</h3>
        {plan.payments.length === 0 ? (
          <EmptyState title="No payments recorded yet" className="py-6" />
        ) : (
          <ul className="space-y-1.5">
            {plan.payments.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  {formatPKR(Number(p.amount))} · {p.method.replace("_", " ")} {p.referenceNumber && `· ${p.referenceNumber}`}
                  {p.isSelfReported && (
                    <Badge variant="secondary" className="text-[10px]">
                      Submitted by parent
                    </Badge>
                  )}
                  {p.status !== "PAID" && <StatusBadge status={p.status === "PENDING" ? "PENDING_REVIEW" : p.status} />}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {p.receiptFileId && (
                    <a href={`/api/files/${p.receiptFileId}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Receipt
                    </a>
                  )}
                  {p.paidAt ? formatDate(p.paidAt) : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CreatePlanDialog({ studentId }: { studentId: string }) {
  const fields: FieldDef[] = [
    { type: "number", name: "totalFee", label: "Total Fee (PKR)", required: true },
    { type: "number", name: "numberOfInstallments", label: "Number of Installments", required: true },
    { type: "text", name: "firstDueDate", label: "First Due Date (YYYY-MM-DD)", required: true },
  ];

  return (
    <EntityDialog
      trigger={
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Create Payment Plan
        </Button>
      }
      title="Create Payment Plan"
      fields={fields}
      onSubmit={(data) => createPaymentPlanAction(studentId, data)}
    />
  );
}

function RecordPaymentDialog({ studentId, plan }: { studentId: string; plan: Plan }) {
  const [open, setOpen] = React.useState(false);
  const [installmentId, setInstallmentId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState("CASH");
  const [reference, setReference] = React.useState("");
  const [pending, setPending] = React.useState(false);

  const unpaidInstallments = plan.installments.filter((i) => i.status !== "PAID");

  async function handleSubmit() {
    if (!amount) {
      toast.error("Enter an amount.");
      return;
    }
    setPending(true);
    try {
      const result = await recordPaymentAction(plan.id, studentId, {
        installmentId: installmentId || undefined,
        amount,
        method,
        referenceNumber: reference || undefined,
      });
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Payment recorded");
        setOpen(false);
        setAmount("");
        setReference("");
      }
    } catch {
      toast.error("Could not record payment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Wallet className="mr-1.5 h-3.5 w-3.5" /> Record Payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Installment (optional)</Label>
            <Select value={installmentId} onValueChange={setInstallmentId}>
              <SelectTrigger><SelectValue placeholder="No specific installment" /></SelectTrigger>
              <SelectContent>
                {unpaidInstallments.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    #{i.installmentNumber} — {formatPKR(Number(i.amount))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Amount (PKR) *</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Method *</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {METHOD_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Reference Number</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Transaction ID / receipt no." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? "Saving…" : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
