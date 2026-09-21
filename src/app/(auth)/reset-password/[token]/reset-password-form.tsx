"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeadMarkEmblem } from "@/components/shared/head-mark-emblem";
import { resetPasswordAction, type ResetPasswordState } from "../../password-reset-actions";

const initialState: ResetPasswordState = {};

export function ResetPasswordForm({ token, tokenValid }: { token: string; tokenValid: boolean }) {
  const action = resetPasswordAction.bind(null, token);
  const [state, formAction] = useFormState(action, initialState);

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <HeadMarkEmblem className="mb-3 h-14 w-14" />
        <h1 className="text-xl font-bold">Set a New Password</h1>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
        {!tokenValid ? (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <XCircle className="h-10 w-10 text-destructive" />
            <p className="text-sm font-medium">This link is invalid or has expired</p>
            <p className="text-sm text-muted-foreground">Reset links are single-use and expire after 1 hour.</p>
            <Link href="/forgot-password" className="mt-2 text-sm font-medium text-primary hover:underline">
              Request a new link
            </Link>
          </div>
        ) : state.success ? (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <CheckCircle2 className="h-10 w-10 text-success" />
            <p className="text-sm font-medium">Password updated</p>
            <p className="text-sm text-muted-foreground">You can now sign in with your new password.</p>
            <Link href="/login" className="mt-2 text-sm font-medium text-primary hover:underline">
              Go to sign in
            </Link>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">New Password</Label>
              <Input id="password" name="password" type="password" autoComplete="new-password" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
            </div>

            {state.error && (
              <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            )}

            <SubmitButton />
          </form>
        )}
      </div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Saving…" : "Set New Password"}
    </Button>
  );
}
