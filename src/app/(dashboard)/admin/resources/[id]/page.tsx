import { notFound } from "next/navigation";
import * as resources from "@/lib/services/resources";
import { PageHeader } from "@/components/shared/page-header";
import { ArticleForm } from "../article-form";
import { updateArticleAction } from "../actions";

export default async function EditArticlePage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const article = await resources.getForAdmin(id);
  if (!article) notFound();
  const topics = [...new Set([...(await resources.listTopics("BLOG")), ...(await resources.listTopics("STUDY_TIPS"))])];
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Edit article" description={`The web address stays /${article.slug} even if you change the title.`} />
      <ArticleForm
        action={updateArticleAction.bind(null, article.id)}
        topics={topics}
        defaults={{
          title: article.title,
          excerpt: article.excerpt,
          body: article.body,
          category: article.category,
          topic: article.topic ?? "",
          authorName: article.authorName,
          isPublished: article.isPublished,
        }}
      />
    </div>
  );
}
