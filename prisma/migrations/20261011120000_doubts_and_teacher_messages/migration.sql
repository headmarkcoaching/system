-- CreateEnum
CREATE TYPE "DoubtStatus" AS ENUM ('OPEN', 'ANSWERED', 'RESOLVED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FilePurpose" ADD VALUE 'DOUBT_ATTACHMENT';
ALTER TYPE "FilePurpose" ADD VALUE 'MESSAGE_ATTACHMENT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'DOUBT_UPDATE';
ALTER TYPE "NotificationType" ADD VALUE 'TEACHER_MESSAGE';

-- CreateTable
CREATE TABLE "doubts" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "chapter" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentFileId" TEXT,
    "status" "DoubtStatus" NOT NULL DEFAULT 'OPEN',
    "firstResponseAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "doubts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doubt_replies" (
    "id" TEXT NOT NULL,
    "doubtId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doubt_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_threads" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "startedById" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAuthorId" TEXT,
    "familyReadAt" TIMESTAMP(3),
    "teacherReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachmentFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "teacher_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "doubts_studentId_lastActivityAt_idx" ON "doubts"("studentId", "lastActivityAt");

-- CreateIndex
CREATE INDEX "doubts_batchId_subjectId_status_idx" ON "doubts"("batchId", "subjectId", "status");

-- CreateIndex
CREATE INDEX "doubts_status_createdAt_idx" ON "doubts"("status", "createdAt");

-- CreateIndex
CREATE INDEX "doubt_replies_doubtId_createdAt_idx" ON "doubt_replies"("doubtId", "createdAt");

-- CreateIndex
CREATE INDEX "teacher_threads_teacherId_lastMessageAt_idx" ON "teacher_threads"("teacherId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "teacher_threads_startedById_lastMessageAt_idx" ON "teacher_threads"("startedById", "lastMessageAt");

-- CreateIndex
CREATE INDEX "teacher_threads_studentId_idx" ON "teacher_threads"("studentId");

-- CreateIndex
CREATE INDEX "teacher_messages_threadId_createdAt_idx" ON "teacher_messages"("threadId", "createdAt");

-- AddForeignKey
ALTER TABLE "doubts" ADD CONSTRAINT "doubts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doubts" ADD CONSTRAINT "doubts_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doubts" ADD CONSTRAINT "doubts_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doubts" ADD CONSTRAINT "doubts_attachmentFileId_fkey" FOREIGN KEY ("attachmentFileId") REFERENCES "uploaded_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doubt_replies" ADD CONSTRAINT "doubt_replies_doubtId_fkey" FOREIGN KEY ("doubtId") REFERENCES "doubts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doubt_replies" ADD CONSTRAINT "doubt_replies_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doubt_replies" ADD CONSTRAINT "doubt_replies_attachmentFileId_fkey" FOREIGN KEY ("attachmentFileId") REFERENCES "uploaded_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_threads" ADD CONSTRAINT "teacher_threads_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_threads" ADD CONSTRAINT "teacher_threads_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_threads" ADD CONSTRAINT "teacher_threads_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_messages" ADD CONSTRAINT "teacher_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "teacher_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_messages" ADD CONSTRAINT "teacher_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_messages" ADD CONSTRAINT "teacher_messages_attachmentFileId_fkey" FOREIGN KEY ("attachmentFileId") REFERENCES "uploaded_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

