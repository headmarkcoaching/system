import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";
import { ROLE_HOME_PATH } from "@/lib/permissions";

// Edge-safe: built from the provider-less config so bcrypt (Node-only, used in the
// Credentials provider's authorize()) never gets bundled into the Edge middleware.
const { auth } = NextAuth(authConfig);

const SECTION_ROLES: Record<string, string[]> = {
  admin: ["SUPER_ADMIN", "ADMIN"],
  teacher: ["TEACHER"],
  student: ["STUDENT"],
  parent: ["PARENT"],
  counselor: ["COUNSELOR"],
};

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role as keyof typeof ROLE_HOME_PATH | undefined;

  const isAuthPage =
    nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/forgot-password") ||
    nextUrl.pathname.startsWith("/reset-password");
  // /api/cron is a server-to-server route authenticated by its own CRON_SECRET check
  // (see src/app/api/cron/[job]/route.ts) — a scheduler is never a logged-in browser session.
  // /api/v1 is the public REST surface authenticated by its own Bearer API-key check (see
  // src/lib/api-utils.ts's requireApiKey) — an external mobile app/integration is never a
  // logged-in browser session either, so it must bypass the session-redirect the same way.
  // /refer/[code] is the public referral-link landing page — anyone with the link (not
  // necessarily a logged-in user) needs to be able to submit it.
  // /home, /programs, /about, /contact, /enroll, /pricing, /privacy, /terms are the public
  // marketing site — ad traffic, organic visitors, and post-trial leads following a shared link
  // are never logged-in browser sessions, same reasoning as /refer/[code].
  // /brand is static logo/brand assets served from public/brand — used on the login page and
  // every public marketing page, so it must never require a session. Caught live: an
  // unauthenticated request for the logo was 307-redirected to /login instead of getting the
  // image, which also made Next's image optimizer fail to read the file server-side.
  const MARKETING_PATHS = ["/home", "/programs", "/about", "/contact", "/enroll", "/pricing", "/privacy", "/terms"];
  const isPublic =
    nextUrl.pathname === "/" ||
    isAuthPage ||
    nextUrl.pathname.startsWith("/api/auth") ||
    nextUrl.pathname.startsWith("/api/cron") ||
    nextUrl.pathname.startsWith("/api/v1") ||
    nextUrl.pathname.startsWith("/refer/") ||
    nextUrl.pathname.startsWith("/brand/") ||
    MARKETING_PATHS.some((p) => nextUrl.pathname === p || nextUrl.pathname.startsWith(`${p}/`));

  if (!isLoggedIn && !isPublic) {
    const loginUrl = new URL("/login", nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL(role ? ROLE_HOME_PATH[role] : "/", nextUrl.origin));
  }

  if (isLoggedIn && role) {
    const section = nextUrl.pathname.split("/")[1];
    const allowedRoles = SECTION_ROLES[section];
    if (allowedRoles && !allowedRoles.includes(role)) {
      return NextResponse.redirect(new URL(ROLE_HOME_PATH[role], nextUrl.origin));
    }
  }

  return NextResponse.next();
});

export const config = {
  // manifest.webmanifest, sw.js and offline.html are PWA files the browser fetches without a
  // session (and a login redirect on any of them would break installing the app).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|robots.txt|sitemap.xml|manifest.webmanifest|sw.js|offline.html).*)"],
};
