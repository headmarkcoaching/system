-- AlterEnum
ALTER TYPE "FilePurpose" ADD VALUE 'PAYMENT_RECEIPT';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "isSelfReported" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "receiptFileId" TEXT;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_receiptFileId_fkey" FOREIGN KEY ("receiptFileId") REFERENCES "uploaded_files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
