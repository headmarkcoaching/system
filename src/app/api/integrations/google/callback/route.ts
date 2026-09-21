import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { SUPER_ADMIN_ONLY } from "@/lib/permissions";
import * as integrationSettingsService from "@/lib/services/integration-settings";

const STATE_COOKIE = "google_oauth_state";

function redirectWithError(request: NextRequest, message: string) {
  const url = new URL("/admin/settings/integrations", request.url);
  url.searchParams.set("error", message);
  const response = NextResponse.redirect(url);
  response.cookies.delete(STATE_COOKIE);
  return response;
}

/** Completes the "Connect Google Account" flow: exchanges the auth code for a refresh token,
 * identifies which account was connected, and saves both — the only Google-related thing left
 * for the Super Admin to do after this is the one-time Client ID/Secret paste that has to
 * happen first (see the connect route). */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user || !SUPER_ADMIN_ONLY.includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const error = searchParams.get("error");
  if (error) return redirectWithError(request, `Google declined: ${error}`);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const savedState = request.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !savedState || state !== savedState) {
    return redirectWithError(request, "Invalid or expired OAuth state — please try connecting again.");
  }

  const settings = await integrationSettingsService.getIntegrationSettingsInternal();
  if (!settings.googleClientId || !settings.googleClientSecret) {
    return redirectWithError(request, "Google Client ID/Secret aren't saved — enter them first.");
  }

  const redirectUri = new URL("/api/integrations/google/callback", request.url).toString();

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: settings.googleClientId,
        client_secret: settings.googleClientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token?: string; refresh_token?: string; error?: string; error_description?: string };

    if (!tokenRes.ok || !tokenData.access_token) {
      return redirectWithError(request, tokenData.error_description || tokenData.error || "Token exchange failed");
    }

    if (!tokenData.refresh_token) {
      return redirectWithError(
        request,
        "Google didn't return a refresh token — this usually means the account already granted access before. Remove this app's access at https://myaccount.google.com/permissions and try connecting again."
      );
    }

    const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userinfo = (await userinfoRes.json()) as { email?: string };

    await integrationSettingsService.saveGoogleConnection({
      refreshToken: tokenData.refresh_token,
      connectedEmail: userinfo.email || "Unknown account",
    });

    const response = NextResponse.redirect(new URL("/admin/settings/integrations?google=connected", request.url));
    response.cookies.delete(STATE_COOKIE);
    return response;
  } catch (err) {
    return redirectWithError(request, err instanceof Error ? err.message : "Unknown error");
  }
}
