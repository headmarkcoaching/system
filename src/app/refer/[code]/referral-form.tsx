"use client";

import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as React from "react";
import { SubjectPicker, type SubjectOption } from "@/components/shared/subject-picker";
import { submitReferralAction, type SubmitReferralState } from "./actions";

const initialState: SubmitReferralState = {};

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
  const [state, formAction] = useActionState(action, initialState);
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
      action={formAction}
      className="space-y-4"
      onSubmit={(e) => {
        // Stop here (instead of letting the server refuse it) so nothing the family typed is lost.
        const needsSubject = Boolean(levelId) && (subjectsByClass[levelId]?.length ?? 0) > 0;
        if (needsSubject && new FormData(e.currentTarget).getAll("subjectIds").length === 0) {
          e.preventDefault();
          setPickError("Please choose at least one subject you want to try.");
        } else {
          setPickError(null);
        }
      }}
    >
      <div className="space-y-1.5">
        <Label>Student Name *</Label>
        <Input name="studentName" defaultValue={state.values?.studentName} required />
      </div>
      <div className="space-y-1.5">
        <Label>Parent Name *</Label>
        <Input name="parentName" defaultValue={state.values?.parentName} required />
      </div>
      <div className="space-y-1.5">
        <Label>Parent Phone / WhatsApp *</Label>
        <Input name="parentPhone" placeholder="03xx-xxxxxxx" defaultValue={state.values?.parentPhone} required />
      </div>
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
