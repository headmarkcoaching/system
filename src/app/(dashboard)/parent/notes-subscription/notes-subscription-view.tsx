"use client";

import * as React from "react";
import { toast } from "sonner";
import { Truck, Package, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { subscribeNotesAction, cancelNotesSubscriptionAction, submitNotesPaymentAction } from "./actions";

const METHOD_OPTIONS = [
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "JAZZCASH", label: "JazzCash" },
  { value: "EASYPAISA", label: "Easypaisa" },
  { value: "RAAST", label: "Raast" },
  { value: "CASH", label: "Cash" },
  { value: "OTHER", label: "Other" },
];

interface Subscription {
  id: string;
  subjectId: string;
  subjectName: string;
  status: string;
  deliveryName: string;
  deliveryAddress: string;
  deliveryCity: string;
  deliveryPhone: string;
  currentMonthPayment: { status: string; shippedAt: Date | null } | null;
}

export function NotesSubscriptionView({
  studentId,
  studentName,
  parentPhone,
  subjects,
  subscriptions,
}: {
  studentId: string;
  studentName: string;
  parentPhone: string;
  subjects: { id: string; name: string }[];
  subscriptions: Subscription[];
}) {
  const activeBySubject = new Map(subscriptions.filter((s) => s.status === "ACTIVE").map((s) => [s.subjectId, s]));

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {subjects.map((subject) => {
        const sub = activeBySubject.get(subject.id);
        return sub ? (
          <ActiveSubscriptionCard key={subject.id} studentId={studentId} subscription={sub} />
        ) : (
          <SubscribeCard key={subject.id} studentId={studentId} studentName={studentName} parentPhone={parentPhone} subject={subject} />
        );
      })}
    </div>
  );
}

function SubscribeCard({
  studentId,
  studentName,
  parentPhone,
  subject,
}: {
  studentId: string;
  studentName: string;
  parentPhone: string;
  subject: { id: string; name: string };
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(studentName);
  const [address, setAddress] = React.useState("");
  const [city, setCity] = React.useState("");
  const [phone, setPhone] = React.useState(parentPhone);
  const [pending, setPending] = React.useState(false);

  async function handleSubscribe() {
    if (!address || !city || !phone) {
      toast.error("Fill in the full delivery address.");
      return;
    }
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("subjectId", subject.id);
      formData.set("deliveryName", name);
      formData.set("deliveryAddress", address);
      formData.set("deliveryCity", city);
      formData.set("deliveryPhone", phone);
      await subscribeNotesAction(studentId, formData);
      toast.success(`Subscribed to ${subject.name} notes`);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not subscribe.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{subject.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Printed notes mailed to your address every month.</p>
        <p className="text-lg font-semibold">Rs 1,500 / month</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="cta" size="sm" className="w-full">
              <Package className="mr-1.5 h-3.5 w-3.5" /> Subscribe
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Subscribe to {subject.name} Notes</DialogTitle>
              <DialogDescription>Rs 1,500/month. Where should the academy mail this month's and every future month's notes?</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Recipient Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Postal Address *</Label>
                <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House/Street, Area" />
              </div>
              <div className="space-y-1.5">
                <Label>City *</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Phone *</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                Cancel
              </Button>
              <Button variant="cta" onClick={handleSubscribe} disabled={pending}>
                {pending ? "Subscribing…" : "Subscribe — Rs 1,500/mo"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function ActiveSubscriptionCard({ studentId, subscription }: { studentId: string; subscription: Subscription }) {
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [cancelPending, setCancelPending] = React.useState(false);

  async function handleCancel() {
    setCancelPending(true);
    try {
      await cancelNotesSubscriptionAction(subscription.id, studentId);
      toast.success("Subscription cancelled");
      setCancelOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel.");
    } finally {
      setCancelPending(false);
    }
  }

  const payment = subscription.currentMonthPayment;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          {subscription.subjectName}
          {payment && <StatusBadge status={payment.status} />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Mailing to:</p>
          <p>
            {subscription.deliveryName} · {subscription.deliveryPhone}
          </p>
          <p>
            {subscription.deliveryAddress}, {subscription.deliveryCity}
          </p>
        </div>

        {payment?.shippedAt && (
          <p className="flex items-center gap-1.5 text-xs text-success">
            <Truck className="h-3.5 w-3.5" /> Mailed {new Date(payment.shippedAt).toLocaleDateString("en-PK", { day: "2-digit", month: "short" })}
          </p>
        )}

        {(!payment || payment.status === "REJECTED") && <PayThisMonthDialog studentId={studentId} subscriptionId={subscription.id} rejected={payment?.status === "REJECTED"} />}

        <Button variant="outline" size="sm" className="w-full text-destructive hover:text-destructive" onClick={() => setCancelOpen(true)}>
          Cancel Subscription
        </Button>
        <ConfirmDialog open={cancelOpen} onOpenChange={setCancelOpen} title="Cancel this subscription?" description="No more months will be mailed after this is cancelled." destructive loading={cancelPending} onConfirm={handleCancel} />
      </CardContent>
    </Card>
  );
}

function PayThisMonthDialog({ studentId, subscriptionId, rejected }: { studentId: string; subscriptionId: string; rejected: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [method, setMethod] = React.useState("BANK_TRANSFER");
  const [reference, setReference] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit() {
    if (!file) {
      toast.error("Attach a receipt.");
      return;
    }
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("method", method);
      if (reference) formData.set("referenceNumber", reference);
      formData.set("file", file);
      await submitNotesPaymentAction(studentId, subscriptionId, formData);
      toast.success("Payment submitted for review");
      setOpen(false);
      setFile(null);
      setReference("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit payment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="cta" size="sm" className="w-full">
          <Wallet className="mr-1.5 h-3.5 w-3.5" /> {rejected ? "Resubmit This Month's Payment" : "Pay This Month — Rs 1,500"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pay This Month's Notes — Rs 1,500</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Pay via bank transfer, JazzCash, or Easypaisa, then attach the receipt below. The academy mails the notes once your payment is confirmed.</p>
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
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-1.5">
            <Label>Receipt *</Label>
            <Input type="file" accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
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
