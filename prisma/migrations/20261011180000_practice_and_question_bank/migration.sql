-- CreateEnum
CREATE TYPE "QuestionDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "BankQuestionSource" AS ENUM ('TEACHER', 'PAST_PAPER', 'AI_DRAFT');

-- CreateEnum
CREATE TYPE "BankQuestionStatus" AS ENUM ('DRAFT', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PracticeMode" AS ENUM ('PRACTICE', 'EXAM');

-- CreateEnum
CREATE TYPE "PracticeScope" AS ENUM ('CHAPTER', 'QUARTER', 'HALF', 'FULL', 'PAST_PAPER', 'WEAK_AREAS');

-- CreateEnum
CREATE TYPE "PracticeStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "PastPaperSession" AS ENUM ('ANNUAL', 'SUPPLEMENTARY', 'MODEL');

-- AlterEnum
ALTER TYPE "FilePurpose" ADD VALUE 'PAST_PAPER';

-- CreateTable
CREATE TABLE "chapters" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "academicLevelId" TEXT NOT NULL,
    "boardId" TEXT,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_questions" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "academicLevelId" TEXT NOT NULL,
    "boardId" TEXT,
    "chapterId" TEXT NOT NULL,
    "topic" TEXT,
    "type" "QuestionType" NOT NULL,
    "questionText" TEXT NOT NULL,
    "options" JSONB,
    "correctAnswer" TEXT,
    "explanation" TEXT,
    "marks" INTEGER NOT NULL DEFAULT 1,
    "difficulty" "QuestionDifficulty" NOT NULL DEFAULT 'MEDIUM',
    "source" "BankQuestionSource" NOT NULL DEFAULT 'TEACHER',
    "status" "BankQuestionStatus" NOT NULL DEFAULT 'DRAFT',
    "pastPaperId" TEXT,
    "paperOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "past_papers" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "academicLevelId" TEXT NOT NULL,
    "boardId" TEXT,
    "year" INTEGER NOT NULL,
    "session" "PastPaperSession" NOT NULL DEFAULT 'ANNUAL',
    "title" TEXT NOT NULL,
    "totalMarks" INTEGER NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "fileId" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "past_papers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practice_sessions" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "mode" "PracticeMode" NOT NULL,
    "scope" "PracticeScope" NOT NULL,
    "scopeLabel" TEXT NOT NULL,
    "chapterIds" TEXT[],
    "pastPaperId" TEXT,
    "questionIds" TEXT[],
    "totalMarks" INTEGER NOT NULL,
    "durationMinutes" INTEGER,
    "status" "PracticeStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "answers" JSONB,
    "marksObtained" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),

    CONSTRAINT "practice_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chapters_subjectId_academicLevelId_idx" ON "chapters"("subjectId", "academicLevelId");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_subjectId_academicLevelId_boardId_number_key" ON "chapters"("subjectId", "academicLevelId", "boardId", "number");

-- CreateIndex
CREATE INDEX "bank_questions_subjectId_chapterId_status_idx" ON "bank_questions"("subjectId", "chapterId", "status");

-- CreateIndex
CREATE INDEX "bank_questions_pastPaperId_idx" ON "bank_questions"("pastPaperId");

-- CreateIndex
CREATE INDEX "past_papers_subjectId_academicLevelId_isPublished_idx" ON "past_papers"("subjectId", "academicLevelId", "isPublished");

-- CreateIndex
CREATE INDEX "practice_sessions_studentId_startedAt_idx" ON "practice_sessions"("studentId", "startedAt");

-- CreateIndex
CREATE INDEX "practice_sessions_studentId_subjectId_status_idx" ON "practice_sessions"("studentId", "subjectId", "status");

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_academicLevelId_fkey" FOREIGN KEY ("academicLevelId") REFERENCES "academic_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_questions" ADD CONSTRAINT "bank_questions_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_questions" ADD CONSTRAINT "bank_questions_academicLevelId_fkey" FOREIGN KEY ("academicLevelId") REFERENCES "academic_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_questions" ADD CONSTRAINT "bank_questions_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_questions" ADD CONSTRAINT "bank_questions_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_questions" ADD CONSTRAINT "bank_questions_pastPaperId_fkey" FOREIGN KEY ("pastPaperId") REFERENCES "past_papers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "past_papers" ADD CONSTRAINT "past_papers_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "past_papers" ADD CONSTRAINT "past_papers_academicLevelId_fkey" FOREIGN KEY ("academicLevelId") REFERENCES "academic_levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "past_papers" ADD CONSTRAINT "past_papers_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "boards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "past_papers" ADD CONSTRAINT "past_papers_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "uploaded_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_pastPaperId_fkey" FOREIGN KEY ("pastPaperId") REFERENCES "past_papers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

