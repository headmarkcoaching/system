import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3200";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/home", "/programs", "/about", "/contact", "/enroll"],
        // Everything else is either the authenticated dashboard app (no value to a crawler,
        // and login-gated anyway) or /pricing, which is deliberately kept out of search per
        // its own page-level `robots: { index: false }` — this just reinforces that at the
        // crawl level too.
        disallow: ["/admin", "/teacher", "/student", "/parent", "/counselor", "/leads", "/students", "/teachers", "/parents", "/batches", "/tests", "/pricing", "/api", "/settings"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
