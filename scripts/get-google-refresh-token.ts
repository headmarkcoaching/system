// One-time setup script: obtains a Google OAuth refresh token for the Google Meet integration
// (src/lib/googlemeet/index.ts) and prints it so you can paste it into .env as
// GOOGLE_REFRESH_TOKEN. Run once per Google account you want auto-created Meet links to come
// from — the refresh token doesn't expire on its own, so this normally runs exactly once.
//
// Setup (one time, in Google Cloud Console — console.cloud.google.com):
//   1. Create a project (or reuse one), enable the "Google Calendar API".
//   2. Create an OAuth client ID: Application type "Web application".
//   3. Under "Authorized redirect URIs" add: http://localhost:8912/oauth2callback
//   4. Copy the Client ID and Client Secret into .env as GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
//   5. If your OAuth consent screen is in "Testing" mode, add the Google account you'll sign
//      in with (in step 6 below) as a test user, or it'll be rejected.
//
// Then run:  npx tsx scripts/get-google-refresh-token.ts
// and follow the printed instructions — it opens a browser tab, you sign in and grant access,
// and this script prints the refresh token once the flow completes.

import http from "node:http";
import { exec } from "node:child_process";

const PORT = 8912;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

try {
  process.loadEnvFile();
} catch {
  // No .env file — fine, continue; env vars may be set another way.
}

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env first (see the comment at the top of this script for how to create them), then re-run.");
  process.exit(1);
}

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", clientId);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPE);
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent"); // forces a refresh_token even if you've authorized this app before

console.log("\nOpen this URL, sign in with the Google account classes should be scheduled from, and grant access:\n");
console.log(authUrl.toString());
console.log("\nWaiting for you to complete sign-in in the browser...\n");

const openCommand = process.platform === "win32" ? `start "" "${authUrl.toString()}"` : process.platform === "darwin" ? `open "${authUrl.toString()}"` : `xdg-open "${authUrl.toString()}"`;
exec(openCommand, () => {
  /* best-effort — the printed URL above works regardless of whether this succeeds */
});

const server = http.createServer(async (req, res) => {
  if (!req.url?.startsWith("/oauth2callback")) {
    res.writeHead(404).end();
    return;
  }

  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.writeHead(200, { "Content-Type": "text/html" }).end(`<h2>Authorization failed: ${error}</h2>You can close this tab.`);
    console.error(`Authorization failed: ${error}`);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400).end("Missing code");
    return;
  }

  res.writeHead(200, { "Content-Type": "text/html" }).end("<h2>Success — you can close this tab.</h2>Check your terminal for the refresh token.");

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      }),
    });

    const data = (await tokenRes.json()) as { refresh_token?: string; error?: string; error_description?: string };

    if (!tokenRes.ok || !data.refresh_token) {
      console.error("\nToken exchange failed:", data.error_description || data.error || (await tokenRes.text()));
      console.error("\nIf this says a refresh token wasn't included, it usually means this Google account already granted access before without `prompt=consent` revoking it first — go to https://myaccount.google.com/permissions, remove this app's access, and re-run this script.");
      process.exit(1);
    }

    console.log("\nSuccess! Add this to your .env:\n");
    console.log(`GOOGLE_REFRESH_TOKEN="${data.refresh_token}"`);
    console.log();
  } catch (err) {
    console.error("Token exchange request failed:", err);
  } finally {
    server.close();
    process.exit(0);
  }
});

server.listen(PORT);
