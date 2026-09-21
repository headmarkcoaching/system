"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createBatchAction, type CreateBatchState } from "../actions";

const initialState: CreateBatchState = {};

export function NewBatchForm({
  levels,
  boards,
  groups,
  programs,
}: {
  levels: { id: string; name: string }[];
  boards: { id: string; name: string }[];
  groups: { id: string; name: string }[];
  programs: { id: string; name: string }[];
}) {
  const [state, formAction] = useFormState(createBatchAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Batch Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Batch Name *</Label>
            <Input name="name" placeholder="e.g. Class 10 Punjab Board Evening A" required />
          </div>
          <SelectField name="academicLevelId" label="Academic Level" required options={levels} />
          <SelectField name="boardId" label="Board" options={boards} />
          <SelectField name="groupId" label="Group" options={groups} />
          <SelectField name="programId" label="Program" options={programs} />
          <div className="space-y-1.5">
            <Label>Maximum Students</Label>
            <Input name="maxStudents" type="number" defaultValue={30} min={1} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select name="status" defaultValue="UPCOMING">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="UPCOMING">Upcoming</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Start Date *</Label>
            <Input name="startDate" type="date" required />
          </div>
          <div className="space-y-1.5">
            <Label>End Date</Label>
            <Input name="endDate" type="date" />
          </div>
        </CardContent>
      </Card>

      {state?.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}

function SelectField({ name, label, required, options }: { name: string; label: string; required?: boolean; options: { id: string; name: string }[] }) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
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
      {pending ? "Saving…" : "Save Batch"}
    </Button>
  );
}
