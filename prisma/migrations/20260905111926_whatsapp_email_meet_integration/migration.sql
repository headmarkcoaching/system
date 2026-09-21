-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "live_classes" ADD COLUMN     "googleEventId" TEXT;

-- AlterTable
ALTER TABLE "message_templates" ADD COLUMN     "emailBody" TEXT,
ADD COLUMN     "emailSubject" TEXT,
ADD COLUMN     "metaTemplateLanguage" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "metaTemplateName" TEXT;

-- AlterTable
ALTER TABLE "whatsapp_messages" ADD COLUMN     "variables" JSONB;

-- CreateTable
CREATE TABLE "email_messages" (
    "id" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "templateKey" "MessageTemplateKey",
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "providerMessageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_messages_status_idx" ON "email_messages"("status");

-- CreateIndex
CREATE INDEX "email_messages_recipientUserId_idx" ON "email_messages"("recipientUserId");

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_templateKey_fkey" FOREIGN KEY ("templateKey") REFERENCES "message_templates"("key") ON DELETE SET NULL ON UPDATE CASCADE;
