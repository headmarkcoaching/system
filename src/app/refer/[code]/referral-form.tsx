"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as React from "react";
import { SubjectPicker, type SubjectOption } from "@/components/shared/subject-picker";
import { LeadContactFields } from "@/components/marketing/lead-contact-fields";
import { submitReferralAction, type SubmitReferralState } from "./actions";

const initialState: SubmitReferralState = {};

// The form is submitted by hand (not through the form's `action`), because React empties every field of a form
// after its action runs, which would wipe what a family has typed and ticked whenever the server refuses it.
export function ReferralForm({
  code,
  levels,
  subjects,
  subjectsByClass,
}: {
  code: string;
  levels: { id: string; name: string }[];
  subjects: SubjectOption[];
  subjectsByClass: Record<string, string[]>;
}) {
  const action = submitReferralAction.bind(null, code);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [levelId, setLevelId] = React.useState("");
  const [pickError, setPickError] = React.useState<string | null>(null);

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
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const needsSubject = Boolean(levelId) && (subjectsByClass[levelId]?.length ?? 0) > 0;
        if (needsSubject && new FormData(form).getAll("subjectIds").length === 0) {
          setPickError("Please choose at least one subject you want to try.");
          return;
        }
        setPickError(null);
        React.startTransition(() => formAction(new FormData(form)));
      }}
    >
      <LeadContactFields values={state.values} siblingToggle />
      {levels.length > 0 && (
        <div className="space-y-1.5">
          <Label>Class *</Label>
          <Select name="academicLevelId" value={levelId} onValueChange={setLevelId} required>
            <SelectTrigger>
              <SelectValue placeholder="Select your class" />
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

      <div className="space-y-1.5">
        <Label>Which subject(s) do you want to try? *</Label>
        <SubjectPicker subjects={subjects} subjectsByClass={subjectsByClass} levelId={levelId} />
      </div>

      {(pickError ?? state.error) && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{pickError ?? state.error}</p>}

      <SubmitButton pending={pending} />
    </form>
  );
}

function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Submitting…" : "Book My Free Trial"}
    </Button>
  );
}
