-- CreateEnum
CREATE TYPE "AutomationRuleKey" AS ENUM ('ATTENDANCE_ABSENCE', 'HOMEWORK_OVERDUE', 'LOW_TEST_SCORE', 'PAYMENT_REMINDER', 'STUDENT_INACTIVITY', 'TRIAL_EXPIRY', 'LEAD_FOLLOWUP', 'CLASS_REMINDER');

-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "MessageTemplateKey" AS ENUM ('LEAD_WELCOME', 'TRIAL_REMINDER', 'CLASS_REMINDER', 'HOMEWORK_REMINDER', 'TEST_REMINDER', 'PAYMENT_REMINDER', 'ATTENDANCE_ALERT', 'AT_RISK_ALERT', 'WEEKLY_PARENT_REPORT', 'ANNOUNCEMENT', 'REFERRAL_INVITATION');

-- CreateEnum
CREATE TYPE "WhatsAppStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" TEXT NOT NULL,
    "key" "AutomationRuleKey" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_logs" (
    "id" TEXT NOT NULL,
    "ruleKey" "AutomationRuleKey" NOT NULL,
    "studentId" TEXT,
    "leadId" TEXT,
    "action" TEXT NOT NULL,
    "status" "AutomationStatus" NOT NULL DEFAULT 'SUCCESS',
    "details" JSONB,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "key" "MessageTemplateKey" NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "templateKey" "MessageTemplateKey",
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "body" TEXT NOT NULL,
    "status" "WhatsAppStatus" NOT NULL DEFAULT 'QUEUED',
    "providerMessageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "automation_rules_key_key" ON "automation_rules"("key");

-- CreateIndex
CREATE INDEX "automation_logs_ruleKey_idx" ON "automation_logs"("ruleKey");

-- CreateIndex
CREATE INDEX "automation_logs_studentId_idx" ON "automation_logs"("studentId");

-- CreateIndex
CREATE INDEX "automation_logs_leadId_idx" ON "automation_logs"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "message_templates_key_key" ON "message_templates"("key");

-- CreateIndex
CREATE INDEX "whatsapp_messages_status_idx" ON "whatsapp_messages"("status");

-- CreateIndex
CREATE INDEX "whatsapp_messages_recipientUserId_idx" ON "whatsapp_messages"("recipientUserId");

-- CreateIndex
CREATE UNIQUE INDEX "communication_preferences_userId_key" ON "communication_preferences"("userId");

-- AddForeignKey
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_templateKey_fkey" FOREIGN KEY ("templateKey") REFERENCES "message_templates"("key") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_preferences" ADD CONSTRAINT "communication_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
