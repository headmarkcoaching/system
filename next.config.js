/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
  // Security headers — none were set before this (Next.js applies no security headers by
  // default). Added as part of a full security review: closes clickjacking (frame-ancestors +
  // X-Frame-Options), a real MIME-sniffing/XSS chain found in /api/files/[id] (that route echoes
  // back the client-supplied upload mimeType as Content-Type; nosniff stops a browser from
  // re-interpreting a mislabeled file as something executable), and adds standard
  // defense-in-depth (Referrer-Policy, Permissions-Policy, HSTS) with no functional trade-off —
  // verified live afterward that the app still loads with zero CSP-violation console errors.
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
      {
        // The browser must re-check the service worker file on every load so a fixed worker
        // reaches users promptly, and it must never run from a stale HTTP cache.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
