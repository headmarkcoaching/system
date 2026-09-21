"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createParentAction, type CreateParentState } from "../actions";

const initialState: CreateParentState = {};

export function NewParentForm() {
  const [state, formAction] = useFormState(createParentAction, initialState);
  const [createLogin, setCreateLogin] = React.useState(false);

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Parent Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Full Name *</Label>
            <Input name="fullName" required />
          </div>
          <div className="space-y-1.5">
            <Label>Phone Number *</Label>
            <Input name="phone" placeholder="03xx-xxxxxxx" required />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp Number</Label>
            <Input name="whatsapp" placeholder="03xx-xxxxxxx" />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input name="email" type="email" />
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input name="city" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Login Access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <Label htmlFor="createLogin">Create a login for this parent</Label>
              <p className="text-xs text-muted-foreground">Parent will sign in with the phone number above.</p>
            </div>
            <Switch id="createLogin" name="createLogin" checked={createLogin} onCheckedChange={setCreateLogin} />
          </div>
          {createLogin && (
            <div className="space-y-1.5">
              <Label>Initial Password *</Label>
              <Input name="loginPassword" placeholder="Minimum 6 characters" />
            </div>
          )}
        </CardContent>
      </Card>

      {state?.error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save Parent"}
    </Button>
  );
}
