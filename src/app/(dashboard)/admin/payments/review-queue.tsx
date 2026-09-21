"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, formatPKR } from "@/lib/utils";
import { verifyPaymentAction } from "./actions";

interface PendingPayment {
  id: string;
  amount: unknown;
  method: string;
  referenceNumber: string | null;
  receiptFileId: string | null;
  createdAt: Date;
  studentId: string;
  student: { fullName: string; studentCode: string };
  installment: { installmentNumber: number } | null;
}

export function ReviewQueue({ payments }: { payments: PendingPayment[] }) {
  const [items, setItems] = React.useState(payments);

  async function handleVerify(id: string, approve: boolean) {
    try {
      await verifyPaymentAction(id, approve);
      setItems((prev) => prev.filter((p) => p.id !== id));
      toast.success(approve ? "Payment approved" : "Payment rejected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update payment.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payments Awaiting Review</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState title="Nothing to review" description="Parent-submitted payments with a receipt show up here." className="py-6" />
        ) : (
          <ul className="space-y-2">
            {items.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
                <div>
                  <Link href={`/students/${p.studentId}?tab=payments`} className="font-medium hover:underline">
                    {p.student.fullName}
                  </Link>
                  <span className="text-muted-foreground"> ({p.student.studentCode})</span>
                  <p className="text-xs text-muted-foreground">
                    {formatPKR(Number(p.amount))} · {p.method.replace("_", " ")}
                    {p.installment && ` · Installment #${p.installment.installmentNumber}`}
                    {p.referenceNumber && ` · ${p.referenceNumber}`} · Submitted {formatDate(p.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {p.receiptFileId && (
                    <a href={`/api/files/${p.receiptFileId}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        <FileText className="mr-1.5 h-3.5 w-3.5" /> Receipt
                      </Button>
                    </a>
                  )}
                  <Button size="sm" onClick={() => handleVerify(p.id, true)}>
                    <Check className="mr-1.5 h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleVerify(p.id, false)}>
                    <X className="mr-1.5 h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
