import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3200";

  // Only the genuinely public, indexable marketing pages. /pricing is deliberately excluded —
  // shared directly with post-trial leads, not meant for cold search discovery.
  const pages = [
    { path: "/home", priority: 1 },
    { path: "/programs", priority: 0.9 },
    { path: "/about", priority: 0.7 },
    { path: "/contact", priority: 0.7 },
    { path: "/enroll", priority: 0.8 },
    { path: "/resources", priority: 0.7 },
    { path: "/resources/blog", priority: 0.6 },
    { path: "/resources/study-material", priority: 0.6 },
    { path: "/resources/past-papers", priority: 0.6 },
  ];

  const staticEntries = pages.map((p) => ({
    url: `${baseUrl}${p.path}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: p.priority,
  }));

  const articles = await db.resourceArticle.findMany({ where: { isPublished: true }, select: { slug: true, category: true, updatedAt: true } });
  const articleEntries = articles.map((a) => ({
    url: `${baseUrl}${a.category === "BLOG" ? "/resources/blog" : "/resources/study-material"}/${a.slug}`,
    lastModified: a.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...articleEntries];
}
