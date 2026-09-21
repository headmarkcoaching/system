-- CreateTable
CREATE TABLE "sms_messages" (
    "id" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "recipientUserId" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "body" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "providerMessageId" TEXT,
    "sentAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sms_messages_status_idx" ON "sms_messages"("status");

-- CreateIndex
CREATE INDEX "sms_messages_recipientUserId_idx" ON "sms_messages"("recipientUserId");

-- AddForeignKey
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
