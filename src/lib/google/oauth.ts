import "server-only";
import * as integrationSettingsService from "@/lib/services/integration-settings";

export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/drive.file",
  // Google Meet API: create class rooms that record by themselves, and read the finished recordings.
  "https://www.googleapis.com/auth/meetings.space.created",
  "https://www.googleapis.com/auth/meetings.space.readonly",
  // Read-only: lets the app stream a finished class recording from where Meet saved it in the
  // academy's Drive. It cannot change or delete anything there.
  "https://www.googleapis.com/auth/drive.readonly",
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

// Access tokens last an hour. Every file view and upload now goes through Drive, so asking Google
// for a new token each time would add a round trip to every page that shows an attachment. The
// token is kept in this instance's memory for most of its life, keyed by the refresh token so a
// reconnected account never reuses the old account's token.
let cachedToken: { refreshToken: string; token: string; expiresAt: number } | null = null;

/** Exchanges a refresh token for an access token, reusing a recent one while it is still valid. */
export async function getGoogleAccessToken(credentials: GoogleCredentials): Promise<string> {
  if (cachedToken && cachedToken.refreshToken === credentials.refreshToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

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

  const data = (await res.json()) as { access_token: string; expires_in?: number };
  cachedToken = {
    refreshToken: credentials.refreshToken,
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}
