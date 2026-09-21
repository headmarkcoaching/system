"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeadMarkEmblem } from "@/components/shared/head-mark-emblem";
import { requestPasswordResetAction, type RequestResetState } from "../password-reset-actions";

const initialState: RequestResetState = {};

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState(requestPasswordResetAction, initialState);

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <HeadMarkEmblem className="mb-3 h-14 w-14" />
        <h1 className="text-xl font-bold">Reset Your Password</h1>
        <p className="mt-1 text-sm text-muted-foreground">Enter your email and we&apos;ll send you a reset link.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
        {state.success ? (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <CheckCircle2 className="h-10 w-10 text-success" />
            <p className="text-sm font-medium">Check your email</p>
            <p className="text-sm text-muted-foreground">
              If an account exists with that email, we&apos;ve sent a link to reset your password. It expires in 1
              hour.
            </p>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="identifier">Email or phone number</Label>
              <Input id="identifier" name="identifier" placeholder="you@example.com" autoComplete="username" required />
              <p className="text-xs text-muted-foreground">
                Only accounts with an email on file can reset online — a phone-only account should ask an admin for help.
              </p>
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

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Sending…" : "Send Reset Link"}
    </Button>
  );
}
