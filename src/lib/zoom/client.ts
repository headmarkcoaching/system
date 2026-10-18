import "server-only";
import * as integrationSettingsService from "@/lib/services/integration-settings";

/**
 * Zoom, called with plain fetch (no SDK), the same lightweight style as the Google code.
 *
 * The academy makes one Server-to-Server OAuth app in the Zoom Marketplace; its Account ID, Client ID
 * and Client Secret are saved (encrypted) under Settings → Integrations. This file turns those into a
 * short-lived access token and wraps the calls we need.
 */

export interface ZoomCredentials {
  accountId: string;
  clientId: string;
  clientSecret: string;
  hostEmail: string;
}

export class ZoomApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: number
  ) {
    super(message);
    this.name = "ZoomApiError";
  }
}

export async function getZoomCredentials(): Promise<ZoomCredentials | null> {
  const s = await integrationSettingsService.getIntegrationSettingsInternal();
  if (!s.zoomAccountId || !s.zoomClientId || !s.zoomClientSecret || !s.zoomHostEmail) return null;
  return { accountId: s.zoomAccountId, clientId: s.zoomClientId, clientSecret: s.zoomClientSecret, hostEmail: s.zoomHostEmail };
}

// Zoom access tokens last an hour. Kept in this instance's memory and keyed by the account and client,
// so changing the saved details never reuses a token that belongs to the old ones.
let cachedToken: { key: string; token: string; expiresAt: number } | null = null;

export async function getZoomAccessToken(credentials: ZoomCredentials): Promise<string> {
  const key = `${credentials.accountId}:${credentials.clientId}`;
  if (cachedToken && cachedToken.key === key && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  const res = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(credentials.accountId)}`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64")}` },
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; reason?: string; error?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    const reason = data.reason ?? data.error_description ?? data.error ?? `HTTP ${res.status}`;
    throw new ZoomApiError(`Zoom refused the sign-in: ${reason}`, res.status);
  }
  cachedToken = { key, token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return data.access_token;
}

/** One authenticated call to the Zoom REST API. Returns the parsed JSON (or null for an empty body). */
export async function zoomFetch<T = unknown>(path: string, init: { method?: string; body?: unknown; query?: Record<string, string> } = {}): Promise<T | null> {
  const credentials = await getZoomCredentials();
  if (!credentials) throw new ZoomApiError("Zoom isn't connected yet. Add your Zoom details under Settings → Integrations.", 400);
  const token = await getZoomAccessToken(credentials);

  const url = new URL(`https://api.zoom.us/v2${path}`);
  for (const [k, v] of Object.entries(init.query ?? {})) url.searchParams.set(k, v);

  const res = await fetch(url, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${token}`, ...(init.body ? { "Content-Type": "application/json" } : {}) },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 204) return null;
  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;
  if (!res.ok) {
    const err = json as { code?: number; message?: string } | null;
    throw new ZoomApiError(err?.message ?? `Zoom returned HTTP ${res.status}`, res.status, err?.code);
  }
  return json as T;
}

export interface ZoomConnectionCheck {
  ok: boolean;
  hostEmail?: string;
  displayName?: string;
  /** "Licensed" means a paid host seat, which cloud recording and registration need. */
  licence?: "Licensed" | "Basic" | "Unknown";
  error?: string;
}

const USER_TYPE: Record<number, ZoomConnectionCheck["licence"]> = { 1: "Basic", 2: "Licensed" };

/**
 * Proves the saved details work: gets a token, then looks up the host account. A free (Basic) host is
 * reported as such, because cloud recording and registered meetings only work on a paid seat.
 */
export async function testZoomConnection(): Promise<ZoomConnectionCheck> {
  try {
    const credentials = await getZoomCredentials();
    if (!credentials) return { ok: false, error: "Fill in all the Zoom details and save them first." };
    const user = await zoomFetch<{ email: string; first_name?: string; last_name?: string; type: number }>(`/users/${encodeURIComponent(credentials.hostEmail)}`);
    if (!user) return { ok: false, error: "Zoom returned nothing for that host." };
    return {
      ok: true,
      hostEmail: user.email,
      displayName: [user.first_name, user.last_name].filter(Boolean).join(" ") || undefined,
      licence: USER_TYPE[user.type] ?? "Unknown",
    };
  } catch (err) {
    if (err instanceof ZoomApiError) return { ok: false, error: err.message };
    return { ok: false, error: "Couldn't reach Zoom. Check your internet connection and try again." };
  }
}
