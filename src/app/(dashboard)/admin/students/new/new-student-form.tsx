"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createStudentAction, type CreateStudentState } from "../actions";

const initialState: CreateStudentState = {};

export function NewStudentForm({
  levels,
  boards,
  groups,
}: {
  levels: { id: string; name: string }[];
  boards: { id: string; name: string }[];
  groups: { id: string; name: string }[];
}) {
  const [state, formAction] = useFormState(createStudentAction, initialState);
  const [createLogin, setCreateLogin] = React.useState(false);

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Full Name" required>
            <Input name="fullName" required />
          </Field>
          <Field label="Date of Birth">
            <Input name="dateOfBirth" type="date" />
          </Field>
          <Field label="Gender">
            <Select name="gender">
              <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="City">
            <Input name="city" />
          </Field>
          <Field label="Phone Number">
            <Input name="phone" placeholder="03xx-xxxxxxx" />
          </Field>
          <Field label="WhatsApp Number">
            <Input name="whatsapp" placeholder="03xx-xxxxxxx" />
          </Field>
          <Field label="Email">
            <Input name="email" type="email" />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input name="address" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Academic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Academic Level" required>
            <SelectField name="academicLevelId" placeholder="Select level" options={levels} />
          </Field>
          <Field label="Board">
            <SelectField name="boardId" placeholder="Select board" options={boards} />
          </Field>
          <Field label="Group">
            <SelectField name="groupId" placeholder="Select group" options={groups} />
          </Field>
          <Field label="School (optional)">
            <Input name="school" />
          </Field>
          <Field label="Status" required>
            <Select name="status" defaultValue="TRIAL">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="TRIAL">Trial</SelectItem>
                <SelectItem value="PAYMENT_PENDING">Payment Pending</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="ALUMNI">Alumni</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Enrollment Date">
            <Input name="enrollmentDate" type="date" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Login Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <Label htmlFor="createLogin">Create a login for this student</Label>
              <p className="text-xs text-muted-foreground">Requires an email or phone number above.</p>
            </div>
            <Switch id="createLogin" name="createLogin" checked={createLogin} onCheckedChange={setCreateLogin} />
          </div>
          {createLogin && (
            <Field label="Initial Password" required>
              <Input name="loginPassword" type="text" placeholder="Minimum 6 characters" />
            </Field>
          )}
        </CardContent>
      </Card>

      {state?.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}

function SelectField({ name, placeholder, options }: { name: string; placeholder: string; options: { id: string; name: string }[] }) {
  return (
    <Select name={name}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Field({ label, required, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save Student"}
    </Button>
  );
}
