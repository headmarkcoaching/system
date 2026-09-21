import "server-only";
import * as integrationSettingsService from "@/lib/services/integration-settings";

export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.file",
  "openid",
  "email",
].join(" ");

export interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

/** Super-Admin-entered DB settings take priority (see IntegrationSettings); env vars remain a
 * fallback for anyone who set this up before the in-app connect flow existed, or prefers env
 * vars. Returns null if neither source has a complete set of credentials. */
export async function getGoogleCredentials(): Promise<GoogleCredentials | null> {
  const settings = await integrationSettingsService.getIntegrationSettingsInternal();
  const clientId = settings.googleClientId || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = settings.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = settings.googleRefreshToken || process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return null;
  return { clientId, clientSecret, refreshToken };
}

export async function getGoogleCalendarId(): Promise<string> {
  const settings = await integrationSettingsService.getIntegrationSettingsInternal();
  return settings.googleCalendarId || process.env.GOOGLE_CALENDAR_ID || "primary";
}

/** Exchanges a refresh token for a fresh access token. Not cached across requests — Google's
 * token endpoint is fast and this avoids a whole separate expiry-tracking cache for what's a
 * low-frequency operation (creating/deleting a class's Meet link, saving/reading a file). */
export async function getGoogleAccessToken(credentials: GoogleCredentials): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google OAuth token refresh failed (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}
