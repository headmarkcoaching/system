import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3200";

  // Only the genuinely public, indexable marketing pages. /pricing is deliberately excluded —
  // shared directly with post-trial leads, not meant for cold search discovery.
  const pages = [
    { path: "/home", priority: 1 },
    { path: "/programs", priority: 0.9 },
    { path: "/about", priority: 0.7 },
    { path: "/contact", priority: 0.7 },
    { path: "/enroll", priority: 0.8 },
  ];

  return pages.map((p) => ({
    url: `${baseUrl}${p.path}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: p.priority,
  }));
}
