import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import { logAnalyticsEvent } from "@/lib/services/analytics-events";
import { checkRateLimit } from "@/lib/rate-limit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        identifier: { label: "Email or Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const identifier = credentials?.identifier as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!identifier || !password) return null;

        // Brute-force protection: 10 attempts per 15 minutes per identifier, regardless of
        // whether the account exists — a real gap found during the Phase 3E security review
        // (login previously had no rate limiting at all).
        const rate = checkRateLimit(`login:${identifier.trim().toLowerCase()}`, { windowMs: 15 * 60 * 1000, max: 10 });
        if (!rate.allowed) {
          throw new Error("Too many login attempts. Please try again in a few minutes.");
        }

        const user = await db.user.findFirst({
          where: {
            OR: [{ email: identifier.trim() }, { phone: identifier.trim() }],
          },
        });
        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});
        logAnalyticsEvent({ userId: user.id, eventType: "LOGIN" }).catch((err) => console.error("logAnalyticsEvent failed", err));

        return {
          id: user.id,
          name: user.name,
          email: user.email ?? undefined,
          role: user.roleKey,
        };
      },
    }),
  ],
});
