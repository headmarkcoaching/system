import "server-only";
import type { ResourceCategory } from "@prisma/client";
import { db } from "@/lib/db";

/** "How to Score 90% in Physics!" becomes "how-to-score-90-in-physics". Letters, digits and dashes only. */
export function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "article"
  );
}

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  let slug = base;
  for (let n = 2; ; n++) {
    const clash = await db.resourceArticle.findUnique({ where: { slug }, select: { id: true } });
    if (!clash || clash.id === ignoreId) return slug;
    slug = `${base}-${n}`;
  }
}

export function listPublished(category: ResourceCategory, opts: { topic?: string; limit?: number } = {}) {
  return db.resourceArticle.findMany({
    where: { category, isPublished: true, ...(opts.topic ? { topic: opts.topic } : {}) },
    orderBy: { publishedAt: "desc" },
    take: opts.limit,
    select: { id: true, slug: true, title: true, excerpt: true, topic: true, publishedAt: true, authorName: true, body: true },
  });
}

export function getPublishedBySlug(category: ResourceCategory, slug: string) {
  return db.resourceArticle.findFirst({ where: { slug, category, isPublished: true } });
}

export async function listTopics(category: ResourceCategory): Promise<string[]> {
  const rows = await db.resourceArticle.findMany({ where: { category, isPublished: true, topic: { not: null } }, select: { topic: true }, distinct: ["topic"], orderBy: { topic: "asc" } });
  return rows.map((r) => r.topic!).filter(Boolean);
}

export function listAllForAdmin() {
  return db.resourceArticle.findMany({ orderBy: { updatedAt: "desc" }, select: { id: true, slug: true, title: true, category: true, topic: true, isPublished: true, publishedAt: true, updatedAt: true } });
}

export function getForAdmin(id: string) {
  return db.resourceArticle.findUnique({ where: { id } });
}

export interface ArticleInput {
  title: string;
  excerpt: string;
  body: string;
  category: ResourceCategory;
  topic?: string | null;
  isPublished: boolean;
  authorName?: string;
}

export async function createArticle(input: ArticleInput, createdById: string) {
  const slug = await uniqueSlug(slugify(input.title));
  return db.resourceArticle.create({
    data: {
      slug,
      title: input.title,
      excerpt: input.excerpt,
      body: input.body,
      category: input.category,
      topic: input.topic || null,
      isPublished: input.isPublished,
      publishedAt: input.isPublished ? new Date() : null,
      authorName: input.authorName || undefined,
      createdById,
    },
  });
}

/** The address (slug) is fixed when an article is first published, so shared links keep working after edits. */
export async function updateArticle(id: string, input: ArticleInput) {
  const existing = await db.resourceArticle.findUniqueOrThrow({ where: { id }, select: { isPublished: true, publishedAt: true } });
  return db.resourceArticle.update({
    where: { id },
    data: {
      title: input.title,
      excerpt: input.excerpt,
      body: input.body,
      category: input.category,
      topic: input.topic || null,
      isPublished: input.isPublished,
      publishedAt: input.isPublished ? (existing.publishedAt ?? new Date()) : existing.publishedAt,
      authorName: input.authorName || undefined,
    },
  });
}

export function deleteArticle(id: string) {
  return db.resourceArticle.delete({ where: { id } });
}

/** How long an article takes to read, at an ordinary 200 words a minute. */
export function readingMinutes(body: string): number {
  return Math.max(1, Math.round(body.trim().split(/\s+/).length / 200));
}
