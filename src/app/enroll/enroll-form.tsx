"use client";

import { useFormStatus } from "react-dom";
import { useActionState } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as React from "react";
import { SubjectPicker, type SubjectOption } from "@/components/shared/subject-picker";
import { submitEnrollAction, type SubmitEnrollState } from "./actions";

const initialState: SubmitEnrollState = {};

export function EnrollForm({
  levels,
  groups,
  defaultLevelId,
  subjects,
  subjectsByClass,
  source,
  campaign,
}: {
  levels: { id: string; name: string }[];
  groups: { id: string; name: string }[];
  defaultLevelId?: string;
  subjects: SubjectOption[];
  subjectsByClass: Record<string, string[]>;
  source?: string;
  campaign?: string;
}) {
  const action = submitEnrollAction.bind(null, source, campaign);
  const [state, formAction] = useActionState(action, initialState);
  const [levelId, setLevelId] = React.useState(defaultLevelId ?? "");
  const [groupId, setGroupId] = React.useState("");
  const [pickError, setPickError] = React.useState<string | null>(null);

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
      {groups.length > 0 && (
        <div className="space-y-1.5">
          <Label>Group (if 1st/2nd Year)</Label>
          <Select name="groupId" value={groupId} onValueChange={setGroupId}>
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

      <div className="space-y-1.5">
        <Label>Which subject(s) do you want to try? *</Label>
        <SubjectPicker subjects={subjects} subjectsByClass={subjectsByClass} levelId={levelId} groupId={groupId} />
      </div>

      {(pickError ?? state.error) && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{pickError ?? state.error}</p>}

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
