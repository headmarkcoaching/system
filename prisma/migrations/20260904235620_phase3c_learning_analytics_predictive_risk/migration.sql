-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- AlterEnum
ALTER TYPE "AIInteractionFeature" ADD VALUE 'INTERVENTION_RECOMMENDATION';

-- AlterEnum
ALTER TYPE "AutomationRuleKey" ADD VALUE 'PREDICTIVE_RISK_RECALC';

-- AlterTable
ALTER TABLE "test_questions" ADD COLUMN     "topic" TEXT;

-- CreateTable
CREATE TABLE "predictive_risk_scores" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "attendanceTrendComponent" DOUBLE PRECISION NOT NULL,
    "homeworkTrendComponent" DOUBLE PRECISION NOT NULL,
    "testTrendComponent" DOUBLE PRECISION NOT NULL,
    "engagementComponent" DOUBLE PRECISION NOT NULL,
    "inactivityComponent" DOUBLE PRECISION NOT NULL,
    "signals" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "predictive_risk_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "predictive_risk_scores_studentId_idx" ON "predictive_risk_scores"("studentId");

-- CreateIndex
CREATE INDEX "predictive_risk_scores_riskLevel_idx" ON "predictive_risk_scores"("riskLevel");

-- AddForeignKey
ALTER TABLE "predictive_risk_scores" ADD CONSTRAINT "predictive_risk_scores_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
