-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "installmentId" TEXT;

-- CreateIndex
CREATE INDEX "payments_installmentId_idx" ON "payments"("installmentId");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "installments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
