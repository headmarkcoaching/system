import type { Metadata } from "next";
import { ArticleListPage, STUDY_SECTION } from "@/components/marketing/article-pages";

export const metadata: Metadata = {
  title: "Study Material: Exam Tips and Tricks",
  description: STUDY_SECTION.description,
};

export const dynamic = "force-dynamic";

export default async function StudyMaterialPage(props: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await props.searchParams;
  return <ArticleListPage section={STUDY_SECTION} topic={topic} />;
}
