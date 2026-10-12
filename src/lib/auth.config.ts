import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config: callbacks only, no providers. Node-only code (bcrypt in the
 * Credentials provider's authorize()) lives in auth.ts instead, so middleware — which
 * runs on the Edge runtime and only needs to read the session, never authenticate —
 * doesn't pull bcrypt into its bundle.
 */
export const authConfig = {
  // Sessions last two weeks at most and re-sign daily. Whether the account is still active, and
  // whether the password changed after sign-in, is re-checked against the database on every
  // page render and server action (see getVerifiedSession in session.ts).
  session: { strategy: "jwt", maxAge: 14 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: typeof token.role }).role;
        token.id = (user as { id: string }).id;
        // Fixed at sign-in and never refreshed, unlike the token's own iat, so a password change
        // can't be sidestepped by an old session quietly getting a newer timestamp.
        token.authAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
        session.user.authAt = token.authAt;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
