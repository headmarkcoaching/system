"use client";

import * as React from "react";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatPKR } from "@/lib/utils";
import { submitParentPaymentAction } from "./actions";

const METHOD_OPTIONS = [
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "EASYPAISA", label: "Easypaisa" },
  { value: "RAAST", label: "Raast" },
  { value: "CASH", label: "Cash" },
  { value: "OTHER", label: "Other" },
];

interface Installment {
  id: string;
  installmentNumber: number;
  amount: unknown;
  status: string;
}

export function SubmitPaymentDialog({ studentId, installments }: { studentId: string; installments: Installment[] }) {
  const [open, setOpen] = React.useState(false);
  const [installmentId, setInstallmentId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [method, setMethod] = React.useState("BANK_TRANSFER");
  const [reference, setReference] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [pending, setPending] = React.useState(false);

  const unpaidInstallments = installments.filter((i) => i.status !== "PAID");

  function handleInstallmentChange(value: string) {
    setInstallmentId(value);
    const inst = unpaidInstallments.find((i) => i.id === value);
    if (inst) setAmount(String(Number(inst.amount)));
  }

  async function handleSubmit() {
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("amount", amount);
      formData.set("method", method);
      if (installmentId) formData.set("installmentId", installmentId);
      if (reference) formData.set("referenceNumber", reference);
      if (file) formData.set("file", file);
      await submitParentPaymentAction(studentId, formData);
      toast.success("Payment submitted — thank you!");
      setOpen(false);
      setAmount("");
      setReference("");
      setInstallmentId("");
      setFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit payment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="cta" size="sm">
          <Wallet className="mr-1.5 h-3.5 w-3.5" /> Submit Payment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Payment</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Pay via bank transfer, JazzCash, or Easypaisa, then attach the receipt below. The academy will review it and confirm — you&apos;ll see it marked Paid once approved.
          </p>
          {unpaidInstallments.length > 0 && (
            <div className="space-y-1.5">
              <Label>Which month&apos;s fee? (optional)</Label>
              <Select value={installmentId} onValueChange={handleInstallmentChange}>
                <SelectTrigger>
                  <SelectValue placeholder="General payment (no specific month)" />
                </SelectTrigger>
                <SelectContent>
                  {unpaidInstallments.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      #{i.installmentNumber} — {formatPKR(Number(i.amount))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Amount (PKR) *</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Payment Method *</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
            <Label>Transaction / Reference Number</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional, if your bank/wallet gave you one" />
          </div>
          <div className="space-y-1.5">
            <Label>Receipt *</Label>
            <Input type="file" accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <p className="text-xs text-muted-foreground">A photo/screenshot of the bank slip or wallet confirmation, or a PDF. Max 10MB.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button variant="cta" onClick={handleSubmit} disabled={pending}>
            {pending ? "Submitting…" : "Submit Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
