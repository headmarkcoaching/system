"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createLeadAction, type CreateLeadState } from "../actions";

const initialState: CreateLeadState = {};

const SOURCE_OPTIONS = [
  { value: "FACEBOOK_ADS", label: "Facebook Ads" },
  { value: "INSTAGRAM_ADS", label: "Instagram Ads" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "WEBSITE", label: "Website" },
  { value: "REFERRAL", label: "Referral" },
  { value: "ORGANIC", label: "Organic" },
  { value: "SCHOOL_PARTNERSHIP", label: "School Partnership" },
  { value: "OTHER", label: "Other" },
];

export function NewLeadForm({
  levels,
  boards,
  groups,
  counselors,
}: {
  levels: { id: string; name: string }[];
  boards: { id: string; name: string }[];
  groups: { id: string; name: string }[];
  counselors: { id: string; fullName: string }[];
}) {
  const [state, formAction] = useFormState(createLeadAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lead Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Student Name *</Label>
            <Input name="studentName" required />
          </div>
          <div className="space-y-1.5">
            <Label>Parent Name *</Label>
            <Input name="parentName" required />
          </div>
          <div className="space-y-1.5">
            <Label>Parent Phone *</Label>
            <Input name="parentPhone" placeholder="03xx-xxxxxxx" required />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp Number</Label>
            <Input name="whatsapp" placeholder="03xx-xxxxxxx" />
          </div>
          <SelectField name="academicLevelId" label="Academic Level" options={levels} />
          <SelectField name="boardId" label="Board" options={boards} />
          <SelectField name="groupId" label="Group" options={groups} />
          <div className="space-y-1.5">
            <Label>Lead Source *</Label>
            <Select name="source" defaultValue="WEBSITE">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Campaign</Label>
            <Input name="campaign" />
          </div>
          <SelectField name="assignedCounselorId" label="Assigned Counselor" options={counselors.map((c) => ({ id: c.id, name: c.fullName }))} />
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Notes</Label>
            <Input name="notes" />
          </div>
        </CardContent>
      </Card>

      {state?.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}

function SelectField({ name, label, options }: { name: string; label: string; options: { id: string; name: string }[] }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select name={name}>
        <SelectTrigger><SelectValue placeholder={`Select ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save Lead"}
    </Button>
  );
}
