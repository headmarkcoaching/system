import { signOut } from "@/lib/auth";

// Where a session lands when it is no longer trusted (account switched off, password changed,
// role changed). It has to clear the cookie itself: sending the browser straight to /login would
// bounce back, because the middleware still sees a signed cookie and sends signed-in users away
// from the login page.
export async function GET() {
  await signOut({ redirectTo: "/login" });
}

export const dynamic = "force-dynamic";
