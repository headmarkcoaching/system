import type { Metadata } from "next";
import { ArticleDetailPage, STUDY_SECTION } from "@/components/marketing/article-pages";
import * as resources from "@/lib/services/resources";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const a = await resources.getPublishedBySlug("STUDY_TIPS", slug);
  return a ? { title: a.title, description: a.excerpt, openGraph: { title: a.title, description: a.excerpt, type: "article" } } : { title: "Guide not found" };
}

export default async function StudyArticlePage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  return <ArticleDetailPage section={STUDY_SECTION} slug={slug} />;
}
