import type { Metadata } from "next";
import { ArticleDetailPage, BLOG_SECTION } from "@/components/marketing/article-pages";
import * as resources from "@/lib/services/resources";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const a = await resources.getPublishedBySlug("BLOG", slug);
  return a ? { title: a.title, description: a.excerpt, openGraph: { title: a.title, description: a.excerpt, type: "article" } } : { title: "Article not found" };
}

export default async function BlogArticlePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  return <ArticleDetailPage section={BLOG_SECTION} slug={slug} />;
}
