"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, initialState);

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center text-center">
        <Image
          src="/brand/head-mark-coaching-logo.png"
          alt="Head Mark Coaching"
          width={1564}
          height={1066}
          className="h-20 w-auto"
          priority
        />
        <p className="mt-2 text-sm text-muted-foreground">Sign in to your account</p>
      </div>

      <form action={formAction} className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="space-y-1.5">
          <Label htmlFor="identifier">Email or phone number</Label>
          <Input id="identifier" name="identifier" placeholder="you@example.com or 03xx-xxxxxxx" autoComplete="username" required />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>

        {state?.error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        )}

        <SubmitButton />
      </form>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}
