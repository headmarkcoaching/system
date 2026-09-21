"use client";

import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitReferralAction, type SubmitReferralState } from "./actions";

const initialState: SubmitReferralState = {};

export function ReferralForm({ code, levels }: { code: string; levels: { id: string; name: string }[] }) {
  const action = submitReferralAction.bind(null, code);
  const [state, formAction] = useFormState(action, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-success" />
        <h2 className="text-lg font-semibold">Thanks — we&apos;ve got it!</h2>
        <p className="text-sm text-muted-foreground">Our admissions team will reach out on WhatsApp shortly to schedule a free trial class.</p>
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
          <Select name="academicLevelId">
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

      {state.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Submitting…" : "Book My Free Trial"}
    </Button>
  );
}
