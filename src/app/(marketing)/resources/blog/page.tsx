import type { Metadata } from "next";
import { ArticleListPage, BLOG_SECTION } from "@/components/marketing/article-pages";

export const metadata: Metadata = {
  title: "Blog",
  description: BLOG_SECTION.description,
};

export const dynamic = "force-dynamic";

export default async function BlogPage(props: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await props.searchParams;
  return <ArticleListPage section={BLOG_SECTION} topic={topic} />;
}
