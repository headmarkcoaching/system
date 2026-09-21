"use client";

import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitEnrollAction, type SubmitEnrollState } from "./actions";

const initialState: SubmitEnrollState = {};

export function EnrollForm({
  levels,
  groups,
  defaultLevelId,
  source,
  campaign,
}: {
  levels: { id: string; name: string }[];
  groups: { id: string; name: string }[];
  defaultLevelId?: string;
  source?: string;
  campaign?: string;
}) {
  const action = submitEnrollAction.bind(null, source, campaign);
  const [state, formAction] = useFormState(action, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 aria-hidden="true" className="h-12 w-12 text-success" />
        <h2 className="text-lg font-semibold">Thanks — we&apos;ve got it!</h2>
        <p className="text-sm text-muted-foreground">Our admissions team will reach out on WhatsApp shortly to schedule your free trial class.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Student Name *</Label>
        <Input name="studentName" required />
      </div>
      <div className="space-y-1.5">
        <Label>Parent Name *</Label>
        <Input name="parentName" required />
      </div>
      <div className="space-y-1.5">
        <Label>Parent Phone / WhatsApp *</Label>
        <Input name="parentPhone" placeholder="03xx-xxxxxxx" required />
      </div>
      {levels.length > 0 && (
        <div className="space-y-1.5">
          <Label>Academic Level</Label>
          <Select name="academicLevelId" defaultValue={defaultLevelId}>
            <SelectTrigger>
              <SelectValue placeholder="Select level (optional)" />
            </SelectTrigger>
            <SelectContent>
              {levels.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {groups.length > 0 && (
        <div className="space-y-1.5">
          <Label>Group (if 1st/2nd Year)</Label>
          <Select name="groupId">
            <SelectTrigger>
              <SelectValue placeholder="Select group (optional)" />
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {state.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}

      <SubmitButton />
      <p className="text-center text-xs text-muted-foreground">
        By submitting, you agree to our{" "}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-cta px-6 py-4 text-base font-bold text-cta-foreground shadow-[0_8px_24px_-6px_hsl(var(--cta)/0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-cta-hover hover:shadow-[0_12px_28px_-6px_hsl(var(--cta)/0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
    >
      {pending ? "Submitting…" : "Book My Free Trial"}
      {!pending && <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />}
    </button>
  );
}
