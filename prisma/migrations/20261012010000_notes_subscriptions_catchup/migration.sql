-- Catch-up: the notes subscription feature (and study-material file uploads) was added to the
-- live database without a migration. This brings a database built from the migration files in line.
-- On the live database it is marked as already applied, not run.

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FilePurpose" ADD VALUE 'STUDY_MATERIAL';
ALTER TYPE "FilePurpose" ADD VALUE 'NOTES_SUBSCRIPTION_RECEIPT';

-- AlterTable
ALTER TABLE "study_materials" ADD COLUMN     "fileId" TEXT,
ALTER COLUMN "fileUrl" DROP NOT NULL;

-- CreateTable
CREATE TABLE "notes_subscriptions" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "pricePerMonth" DECIMAL(10,2) NOT NULL,
    "deliveryName" TEXT NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "deliveryCity" TEXT NOT NULL,
    "deliveryPhone" TEXT NOT NULL,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "createdById" TEXT,

    CONSTRAINT "notes_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes_subscription_payments" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "monthLabel" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod",
    "referenceNumber" TEXT,
    "receiptFileId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "shippedAt" TIMESTAMP(3),
    "trackingNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notes_subscription_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notes_subscriptions_studentId_subjectId_key" ON "notes_subscriptions"("studentId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "notes_subscription_payments_subscriptionId_monthLabel_key" ON "notes_subscription_payments"("subscriptionId", "monthLabel");

-- CreateIndex
CREATE UNIQUE INDEX "study_materials_fileId_key" ON "study_materials"("fileId");

-- AddForeignKey
ALTER TABLE "study_materials" ADD CONSTRAINT "study_materials_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "uploaded_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes_subscriptions" ADD CONSTRAINT "notes_subscriptions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes_subscriptions" ADD CONSTRAINT "notes_subscriptions_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes_subscription_payments" ADD CONSTRAINT "notes_subscription_payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "notes_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes_subscription_payments" ADD CONSTRAINT "notes_subscription_payments_receiptFileId_fkey" FOREIGN KEY ("receiptFileId") REFERENCES "uploaded_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

