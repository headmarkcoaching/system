"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRoleSession } from "@/lib/session";
import { STAFF_ROLES } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import * as resources from "@/lib/services/resources";

const schema = z.object({
  title: z.string().trim().min(5, "Give the article a title of at least 5 characters").max(140, "Keep the title under 140 characters"),
  excerpt: z.string().trim().min(20, "Write a short summary (at least 20 characters)").max(300, "Keep the summary under 300 characters"),
  body: z.string().trim().min(100, "The article is too short. Write at least a few paragraphs.").max(40000, "The article is too long"),
  category: z.enum(["BLOG", "STUDY_TIPS"]),
  topic: z.string().trim().max(40, "Keep the topic under 40 characters").optional(),
  authorName: z.string().trim().max(80).optional(),
});

export interface ArticleFormState {
  error?: string;
  /** What was typed, sent back with an error because React empties the form after an action. */
  values?: { title: string; excerpt: string; body: string; category: string; topic: string; authorName: string; isPublished: boolean };
}

function typed(formData: FormData): NonNullable<ArticleFormState["values"]> {
  const text = (k: string) => String(formData.get(k) ?? "");
  return { title: text("title"), excerpt: text("excerpt"), body: text("body"), category: text("category"), topic: text("topic"), authorName: text("authorName"), isPublished: formData.get("isPublished") === "on" };
}

function refresh(slug?: string) {
  revalidatePath("/admin/resources");
  revalidatePath("/resources");
  revalidatePath("/resources/blog");
  revalidatePath("/resources/study-material");
  revalidatePath("/sitemap.xml");
  if (slug) {
    revalidatePath(`/resources/blog/${slug}`);
    revalidatePath(`/resources/study-material/${slug}`);
  }
}

function read(formData: FormData) {
  const parsed = schema.safeParse({
    title: formData.get("title"),
    excerpt: formData.get("excerpt"),
    body: formData.get("body"),
    category: formData.get("category"),
    topic: formData.get("topic") || undefined,
    authorName: formData.get("authorName") || undefined,
  });
  return { parsed, isPublished: formData.get("isPublished") === "on" };
}

export async function createArticleAction(_prev: ArticleFormState, formData: FormData): Promise<ArticleFormState> {
  const session = await requireRoleSession(STAFF_ROLES);
  const { parsed, isPublished } = read(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: typed(formData) };

  const article = await resources.createArticle({ ...parsed.data, isPublished }, session.user.id);
  await logAudit({ actorId: session.user.id, action: "CREATE", entityType: "ResourceArticle", entityId: article.id, after: { title: article.title, published: article.isPublished } });
  refresh(article.slug);
  redirect("/admin/resources");
}

export async function updateArticleAction(id: string, _prev: ArticleFormState, formData: FormData): Promise<ArticleFormState> {
  const session = await requireRoleSession(STAFF_ROLES);
  const { parsed, isPublished } = read(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message, values: typed(formData) };

  const article = await resources.updateArticle(id, { ...parsed.data, isPublished });
  await logAudit({ actorId: session.user.id, action: "UPDATE", entityType: "ResourceArticle", entityId: id, after: { title: article.title, published: article.isPublished } });
  refresh(article.slug);
  redirect("/admin/resources");
}

export async function deleteArticleAction(id: string): Promise<{ error?: string }> {
  const session = await requireRoleSession(STAFF_ROLES);
  const existing = await resources.getForAdmin(id);
  if (!existing) return { error: "That article no longer exists." };
  await resources.deleteArticle(id);
  await logAudit({ actorId: session.user.id, action: "DELETE", entityType: "ResourceArticle", entityId: id, before: { title: existing.title } });
  refresh(existing.slug);
  return {};
}
