import { NextResponse } from "next/server";

// Digital Asset Links: the file Android checks to confirm that the Play Store app and this website
// belong together. Without it the app still opens, but with a browser address bar across the top;
// with it, the site fills the screen like a native app.
//
// Both values come from Google Play Console once the app exists (Setup → App signing):
//   ANDROID_PACKAGE_NAME          e.g. com.headmarkcoaching.app
//   ANDROID_SHA256_FINGERPRINTS   the SHA-256 certificate fingerprint(s), comma-separated
// Until they are set this returns an empty list, which is valid and simply links nothing.
export function GET() {
  const packageName = process.env.ANDROID_PACKAGE_NAME?.trim();
  const fingerprints = (process.env.ANDROID_SHA256_FINGERPRINTS ?? "")
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter((f) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f));

  const body =
    packageName && fingerprints.length > 0
      ? [
          {
            relation: ["delegate_permission/common.handle_all_urls"],
            target: { namespace: "android_app", package_name: packageName, sha256_cert_fingerprints: fingerprints },
          },
        ]
      : [];

  return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=3600" } });
}

export const dynamic = "force-dynamic";
