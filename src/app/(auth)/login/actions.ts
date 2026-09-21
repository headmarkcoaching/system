"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export interface LoginState {
  error?: string;
}

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const identifier = String(formData.get("identifier") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!identifier || !password) {
    return { error: "Please enter your email/phone and password." };
  }

  try {
    await signIn("credentials", { identifier, password, redirectTo: "/" });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Incorrect email/phone or password." };
    }
    throw error;
  }
}
