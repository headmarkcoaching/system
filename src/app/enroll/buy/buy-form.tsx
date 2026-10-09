"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, ArrowRight, CalendarDays, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { monthlyFee, type BundleKey, type PriceBand } from "@/lib/pricing";
import { submitBuyAction, type BuyState } from "./actions";

export interface BuyBatch {
  id: string;
  name: string;
  meta: string;
  band: PriceBand;
  seatsLeft: number;
  startLabel: string;
  schedule: string | null;
  subjects: { id: string; name: string }[];
}

const initialState: BuyState = {};

export function BuyForm({ batches, initialBatchId, initialBundle }: { batches: BuyBatch[]; initialBatchId: string; initialBundle: BundleKey | null }) {
  const [state, formAction] = useFormState(submitBuyAction, initialState);
  const [batchId, setBatchId] = React.useState(initialBatchId);
  const batch = batches.find((b) => b.id === batchId) ?? batches[0];
  const [selected, setSelected] = React.useState<Set<string>>(() => {
    const first = batches.find((b) => b.id === initialBatchId) ?? batches[0];
    return initialBundle === "all" ? new Set(first.subjects.map((s) => s.id)) : new Set();
  });

  function chooseBatch(id: string) {
    setBatchId(id);
    const next = batches.find((b) => b.id === id);
    setSelected(initialBundle === "all" && next ? new Set(next.subjects.map((s) => s.id)) : new Set());
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const total = batch.subjects.length;
  const price = selected.size > 0 ? monthlyFee(batch.band, selected.size, total) : null;
  const invalidCombo = selected.size > 0 && price === null;
  const wantedHint = initialBundle && initialBundle !== "all" ? `You chose the ${initialBundle}-subject bundle. Pick any ${initialBundle}.` : null;

  if (state.success && state.summary) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 aria-hidden="true" className="h-12 w-12 text-success" />
        <h2 className="text-lg font-semibold">Your seat request is in</h2>
        <p className="text-sm font-medium">{state.summary.batchName}</p>
        <p className="text-sm text-muted-foreground">
          {state.summary.subjects.join(", ")} · Rs {state.summary.price.toLocaleString("en-PK")} / month
        </p>
        <p className="text-sm text-muted-foreground">
          Our admissions team will message you on WhatsApp shortly with payment details. Your seat is confirmed once payment is received.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="batchId">Batch *</Label>
        <Select name="batchId" value={batch.id} onValueChange={chooseBatch}>
          <SelectTrigger id="batchId">
            <SelectValue placeholder="Choose a batch" />
          </SelectTrigger>
          <SelectContent>
            {batches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="space-y-1 pt-1 text-xs text-muted-foreground">
          <p>{batch.meta} · {batch.seatsLeft} seat{batch.seatsLeft === 1 ? "" : "s"} left</p>
          <p className="flex items-center gap-1.5">
            <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 text-primary" /> {batch.startLabel}
            {batch.schedule && (
              <>
                <Clock aria-hidden="true" className="ml-2 h-3.5 w-3.5 text-primary" /> {batch.schedule}
              </>
            )}
          </p>
        </div>
      </div>

      <fieldset className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <legend className="text-sm font-medium">Subjects *</legend>
          <button
            type="button"
            onClick={() => setSelected(new Set(batch.subjects.map((s) => s.id)))}
            className="text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Select all {total}
          </button>
        </div>
        {wantedHint && <p className="text-xs text-muted-foreground">{wantedHint}</p>}
        <div className="grid gap-2 sm:grid-cols-2">
          {batch.subjects.map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/[0.06]"
            >
              <input
                type="checkbox"
                name="subjectIds"
                value={s.id}
                checked={selected.has(s.id)}
                onChange={() => toggle(s.id)}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
              {s.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="rounded-xl border border-border bg-secondary/40 p-4" aria-live="polite">
        {price !== null ? (
          <div className="flex items-end justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {selected.size} subject{selected.size === 1 ? "" : "s"} · per student
            </p>
            <p className="text-right">
              <span className="font-ledger text-3xl font-semibold tabular-nums text-primary">Rs {price.toLocaleString("en-PK")}</span>
              <span className="block text-xs text-muted-foreground">per month</span>
            </p>
          </div>
        ) : invalidCombo ? (
          <p className="text-sm text-destructive">Choose 1, 2 or 3 subjects, or all {total} subjects of this batch.</p>
        ) : (
          <p className="text-sm text-muted-foreground">Choose your subjects to see the monthly fee.</p>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="studentName">Student Name *</Label>
          <Input id="studentName" name="studentName" required autoComplete="off" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="parentName">Parent Name *</Label>
          <Input id="parentName" name="parentName" required autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="parentPhone">Parent Phone / WhatsApp *</Label>
          <Input id="parentPhone" name="parentPhone" placeholder="03xx-xxxxxxx" inputMode="tel" autoComplete="tel" required />
        </div>
      </div>

      {state.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}

      <SubmitButton disabled={price === null} />
      <p className="text-center text-xs text-muted-foreground">
        No payment is taken on this page. By submitting, you agree to our{" "}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-cta px-6 py-4 text-base font-bold text-cta-foreground shadow-[0_8px_24px_-6px_hsl(var(--cta)/0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-cta-hover hover:shadow-[0_12px_28px_-6px_hsl(var(--cta)/0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
    >
      {pending ? "Submitting…" : "Confirm and Buy Now"}
      {!pending && <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />}
    </button>
  );
}
