import Link from "next/link";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import * as resources from "@/lib/services/resources";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { DeleteArticleButton } from "./delete-article-button";

const CATEGORY_LABEL = { BLOG: "Blog", STUDY_TIPS: "Study Material" } as const;
const CATEGORY_PATH = { BLOG: "/resources/blog", STUDY_TIPS: "/resources/study-material" } as const;

export default async function AdminResourcesPage() {
  const articles = await resources.listAllForAdmin();
  return (
    <div className="space-y-6">
      <PageHeader
        title="Blog & Study Tips"
        description="The articles on the website's Resources menu: the blog, and the tips and tricks under Study Material. Past papers come from the Question Bank."
        actions={
          <Button asChild>
            <Link href="/admin/resources/new">
              <Plus className="mr-1.5 h-4 w-4" /> New article
            </Link>
          </Button>
        }
      />

      {articles.length === 0 ? (
        <EmptyState title="No articles yet" description="Write the first one. Published articles appear on the website straight away." />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {articles.map((a) => (
              <div key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium">{a.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{CATEGORY_LABEL[a.category]}</Badge>
                    {a.topic && <span>{a.topic}</span>}
                    <span>Updated {formatDate(a.updatedAt)}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={a.isPublished ? "success" : "secondary"}>{a.isPublished ? "Published" : "Draft"}</Badge>
                  {a.isPublished && (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`${CATEGORY_PATH[a.category]}/${a.slug}`} target="_blank">
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> View
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/resources/${a.id}`}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                    </Link>
                  </Button>
                  <DeleteArticleButton id={a.id} title={a.title} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
