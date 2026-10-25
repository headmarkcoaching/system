import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import type { ResourceCategory } from "@prisma/client";
import * as resources from "@/lib/services/resources";
import { ArticleBody } from "@/components/marketing/article-body";
import { PrimaryCta } from "@/components/marketing/cta-link";
import { DotGrid } from "@/components/marketing/decorative";
import { cn } from "@/lib/utils";

export interface ArticleSection {
  category: ResourceCategory;
  basePath: string;
  eyebrow: string;
  title: string;
  description: string;
  emptyText: string;
}

export const BLOG_SECTION: ArticleSection = {
  category: "BLOG",
  basePath: "/resources/blog",
  eyebrow: "Blog",
  title: "Advice for students and parents",
  description: "How to study, how to stay on top of exams, and how to support your child, from the teachers at Head Mark Coaching.",
  emptyText: "Our first articles are on their way. Check back soon.",
};

export const STUDY_SECTION: ArticleSection = {
  category: "STUDY_TIPS",
  basePath: "/resources/study-material",
  eyebrow: "Study material",
  title: "Tips and tricks for exam preparation",
  description: "Short, practical guides for scoring well in your Board exams: how to revise each subject, manage the paper and avoid common mistakes.",
  emptyText: "Our first study guides are on their way. Check back soon.",
};

function formatDate(d: Date | null) {
  return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
}

export async function ArticleListPage({ section, topic }: { section: ArticleSection; topic?: string }) {
  const [articles, topics] = await Promise.all([resources.listPublished(section.category, { topic }), resources.listTopics(section.category)]);
  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-secondary/30 py-14 sm:py-16">
        <DotGrid className="h-full text-primary" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">{section.eyebrow}</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">{section.title}</h1>
          <p className="mt-4 text-lg text-muted-foreground">{section.description}</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {topics.length > 1 && (
          <div className="mb-8 flex flex-wrap justify-center gap-2" role="group" aria-label="Filter by topic">
            <TopicChip href={section.basePath} active={!topic}>
              All
            </TopicChip>
            {topics.map((t) => (
              <TopicChip key={t} href={`${section.basePath}?topic=${encodeURIComponent(t)}`} active={topic === t}>
                {t}
              </TopicChip>
            ))}
          </div>
        )}

        {articles.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">{section.emptyText}</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((a) => (
              <Link
                key={a.id}
                href={`${section.basePath}/${a.slug}`}
                className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {a.topic && <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{a.topic}</span>}
                <h2 className="mt-3 font-display text-xl font-bold leading-snug text-balance group-hover:text-primary">{a.title}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{a.excerpt}</p>
                <p className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock aria-hidden="true" className="h-3.5 w-3.5" /> {resources.readingMinutes(a.body)} min read
                  </span>
                  <span>{formatDate(a.publishedAt)}</span>
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function TopicChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}

export async function ArticleDetailPage({ section, slug }: { section: ArticleSection; slug: string }) {
  const article = await resources.getPublishedBySlug(section.category, slug);
  if (!article) notFound();
  const more = (await resources.listPublished(section.category, { limit: 4 })).filter((a) => a.id !== article.id).slice(0, 3);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href={section.basePath} className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" /> All {section.eyebrow.toLowerCase()} articles
      </Link>
      <article className="mt-6">
        {article.topic && <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{article.topic}</span>}
        <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-balance sm:text-5xl">{article.title}</h1>
        <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span>{article.authorName}</span>
          <span>{formatDate(article.publishedAt)}</span>
          <span className="inline-flex items-center gap-1">
            <Clock aria-hidden="true" className="h-3.5 w-3.5" /> {resources.readingMinutes(article.body)} min read
          </span>
        </p>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{article.excerpt}</p>
        <div className="mt-8">
          <ArticleBody body={article.body} />
        </div>
      </article>

      <div className="mt-12 rounded-2xl border border-cta/30 bg-cta-wash p-6 text-center">
        <p className="font-display text-xl font-bold">Want a teacher to guide your preparation?</p>
        <p className="mt-1 text-sm text-muted-foreground">Book a free trial class and see how a live Head Mark Coaching class works.</p>
        <PrimaryCta href="/enroll" className="mt-4">
          Book Free Trial
        </PrimaryCta>
      </div>

      {more.length > 0 && (
        <div className="mt-12">
          <h2 className="font-display text-xl font-bold">Keep reading</h2>
          <ul className="mt-4 space-y-3">
            {more.map((a) => (
              <li key={a.id}>
                <Link
                  href={`${section.basePath}/${a.slug}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold hover:border-primary/50"
                >
                  <span>{a.title}</span>
                  <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
