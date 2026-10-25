-- Public blog posts and study tips for the website's Resources menu.
CREATE TYPE "ResourceCategory" AS ENUM ('BLOG', 'STUDY_TIPS');

CREATE TABLE "resource_articles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "ResourceCategory" NOT NULL,
    "topic" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "authorName" TEXT NOT NULL DEFAULT 'Head Mark Coaching',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resource_articles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "resource_articles_slug_key" ON "resource_articles"("slug");
CREATE INDEX "resource_articles_category_isPublished_publishedAt_idx" ON "resource_articles"("category", "isPublished", "publishedAt");
