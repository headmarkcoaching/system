-- CreateEnum
CREATE TYPE "KnowledgeDocType" AS ENUM ('PDF', 'NOTES', 'TEXT', 'STUDY_GUIDE', 'PAST_PAPER', 'TEACHER_CONTENT');

-- CreateEnum
CREATE TYPE "KnowledgeDocStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AIInteractionFeature" AS ENUM ('STUDY_ASSISTANT');

-- CreateEnum
CREATE TYPE "AIInteractionStatus" AS ENUM ('SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "ai_interactions" DROP COLUMN "context",
ADD COLUMN     "completionTokens" INTEGER,
ADD COLUMN     "conversationId" TEXT NOT NULL,
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "feature" "AIInteractionFeature" NOT NULL DEFAULT 'STUDY_ASSISTANT',
ADD COLUMN     "latencyMs" INTEGER,
ADD COLUMN     "model" TEXT NOT NULL,
ADD COLUMN     "promptTokens" INTEGER,
ADD COLUMN     "provider" TEXT NOT NULL,
ADD COLUMN     "status" "AIInteractionStatus" NOT NULL,
ALTER COLUMN "prompt" SET NOT NULL;

-- CreateTable
CREATE TABLE "knowledge_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "docType" "KnowledgeDocType" NOT NULL,
    "academicLevelId" TEXT,
    "boardId" TEXT,
    "groupId" TEXT,
    "subjectId" TEXT,
    "chapter" TEXT,
    "topic" TEXT,
    "sourceUrl" TEXT,
    "content" TEXT NOT NULL,
    "status" "KnowledgeDocStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "uploadedById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_documents_status_idx" ON "knowledge_documents"("status");

-- CreateIndex
CREATE INDEX "knowledge_documents_academicLevelId_idx" ON "knowledge_documents"("academicLevelId");

-- CreateIndex
CREATE INDEX "knowledge_documents_subjectId_idx" ON "knowledge_documents"("subjectId");

-- CreateIndex
CREATE INDEX "ai_interactions_conversationId_idx" ON "ai_interactions"("conversationId");

-- CreateIndex
CREATE INDEX "ai_interactions_userId_idx" ON "ai_interactions"("userId");

-- CreateIndex
CREATE INDEX "ai_interactions_status_idx" ON "ai_interactions"("status");

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_academicLevelId_fkey" FOREIGN KEY ("academicLevelId") REFERENCES "academic_levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_documents" ADD CONSTRAINT "knowledge_documents_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

