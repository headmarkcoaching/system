import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config: callbacks only, no providers. Node-only code (bcrypt in the
 * Credentials provider's authorize()) lives in auth.ts instead, so middleware — which
 * runs on the Edge runtime and only needs to read the session, never authenticate —
 * doesn't pull bcrypt into its bundle.
 */
export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: typeof token.role }).role;
        token.id = (user as { id: string }).id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
