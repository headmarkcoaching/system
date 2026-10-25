import * as resources from "@/lib/services/resources";
import { PageHeader } from "@/components/shared/page-header";
import { ArticleForm } from "../article-form";
import { createArticleAction } from "../actions";

export default async function NewArticlePage() {
  const topics = [...new Set([...(await resources.listTopics("BLOG")), ...(await resources.listTopics("STUDY_TIPS"))])];
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="New article" description="Save it as a draft, or tick Published to put it on the website straight away." />
      <ArticleForm action={createArticleAction} topics={topics} />
    </div>
  );
}
