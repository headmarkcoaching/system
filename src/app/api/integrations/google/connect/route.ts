import { NextRequest, NextResponse } from "next/server";
import { getVerifiedSession } from "@/lib/session";
import { SUPER_ADMIN_ONLY } from "@/lib/permissions";
import { GOOGLE_OAUTH_SCOPES } from "@/lib/google/oauth";
import { createOAuthState } from "@/lib/google/oauth-state";
import * as integrationSettingsService from "@/lib/services/integration-settings";

/** Starts the "Connect Google Account" flow from Settings → Integrations — builds Google's
 * consent URL from the Super Admin's own saved Client ID (there's no way around that first
 * one-time step: creating a Google Cloud OAuth client requires a human in Google's own
 * console) and redirects there. Everything after this button click needs no further setup. */
export async function GET(request: NextRequest) {
  const session = await getVerifiedSession();
  if (!session?.user || !SUPER_ADMIN_ONLY.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await integrationSettingsService.getIntegrationSettingsInternal();
  if (!settings.googleClientId) {
    return NextResponse.redirect(new URL("/admin/settings/integrations?error=missing_client_id", request.url));
  }

  const redirectUri = new URL("/api/integrations/google/callback", request.url).toString();
  const state = createOAuthState(session.user.id);

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", settings.googleClientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GOOGLE_OAUTH_SCOPES);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
