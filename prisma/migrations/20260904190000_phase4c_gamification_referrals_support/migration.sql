-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('INVITED', 'REGISTERED', 'TRIAL', 'ENROLLED', 'REWARDED');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('DISCOUNT', 'FREE_MONTH', 'BONUS_CLASS', 'POINTS', 'OTHER');

-- CreateEnum
CREATE TYPE "SupportCategory" AS ENUM ('ACADEMIC', 'TECHNICAL', 'PAYMENT', 'ACCOUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "SupportStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupportPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "InterventionStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EngagementStatus" AS ENUM ('HIGHLY_ENGAGED', 'ENGAGED', 'LOW_ENGAGEMENT', 'INACTIVE');

-- AlterTable
ALTER TABLE "batches" ADD COLUMN     "leaderboardEnabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "parents" ADD COLUMN     "referralCode" TEXT;

-- AlterTable
ALTER TABLE "referrals" ADD COLUMN     "convertedLeadId" TEXT,
ADD COLUMN     "convertedStudentId" TEXT,
ADD COLUMN     "referralCode" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "ReferralStatus" NOT NULL DEFAULT 'INVITED';

-- AlterTable
ALTER TABLE "student_points" ADD COLUMN     "source" TEXT;

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "referralCode" TEXT;

-- AlterTable
ALTER TABLE "support_tickets" ADD COLUMN     "attachmentUrl" TEXT,
ADD COLUMN     "category" "SupportCategory" NOT NULL DEFAULT 'OTHER',
DROP COLUMN "status",
ADD COLUMN     "status" "SupportStatus" NOT NULL DEFAULT 'OPEN',
DROP COLUMN "priority",
ADD COLUMN     "priority" "SupportPriority" NOT NULL DEFAULT 'MEDIUM';

-- CreateTable
CREATE TABLE "referral_rewards" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "rewardType" "RewardType" NOT NULL,
    "description" TEXT,
    "value" DECIMAL(10,2),
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedById" TEXT,

    CONSTRAINT "referral_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_badges" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "student_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "points_config" (
    "id" TEXT NOT NULL,
    "pointsForAttendance" INTEGER NOT NULL DEFAULT 5,
    "pointsForPerfectWeek" INTEGER NOT NULL DEFAULT 20,
    "pointsForHomeworkSubmit" INTEGER NOT NULL DEFAULT 5,
    "pointsForHomeworkReviewed" INTEGER NOT NULL DEFAULT 10,
    "pointsForHighTestScore" INTEGER NOT NULL DEFAULT 25,
    "highTestScoreThreshold" INTEGER NOT NULL DEFAULT 80,
    "pointsForParticipation" INTEGER NOT NULL DEFAULT 5,
    "pointsForStudyStreak" INTEGER NOT NULL DEFAULT 15,
    "studyStreakDays" INTEGER NOT NULL DEFAULT 7,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "points_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interventions" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "actionPlan" TEXT NOT NULL,
    "responsibleStaffId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "reviewDate" TIMESTAMP(3) NOT NULL,
    "status" "InterventionStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interventions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "engagement_scores" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "status" "EngagementStatus" NOT NULL,
    "attendanceComponent" DOUBLE PRECISION NOT NULL,
    "homeworkComponent" DOUBLE PRECISION NOT NULL,
    "loginComponent" DOUBLE PRECISION NOT NULL,
    "testComponent" DOUBLE PRECISION NOT NULL,
    "participationComponent" DOUBLE PRECISION NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engagement_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_badges_studentId_badgeId_key" ON "student_badges"("studentId", "badgeId");

-- CreateIndex
CREATE INDEX "interventions_studentId_idx" ON "interventions"("studentId");

-- CreateIndex
CREATE INDEX "interventions_status_idx" ON "interventions"("status");

-- CreateIndex
CREATE INDEX "engagement_scores_studentId_idx" ON "engagement_scores"("studentId");

-- CreateIndex
CREATE INDEX "engagement_scores_status_idx" ON "engagement_scores"("status");

-- CreateIndex
CREATE UNIQUE INDEX "parents_referralCode_key" ON "parents"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_convertedLeadId_key" ON "referrals"("convertedLeadId");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_convertedStudentId_key" ON "referrals"("convertedStudentId");

-- CreateIndex
CREATE INDEX "referrals_referralCode_idx" ON "referrals"("referralCode");

-- CreateIndex
CREATE INDEX "student_points_studentId_idx" ON "student_points"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "students_referralCode_key" ON "students"("referralCode");

-- CreateIndex
CREATE INDEX "support_tickets_status_idx" ON "support_tickets"("status");

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_convertedLeadId_fkey" FOREIGN KEY ("convertedLeadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_convertedStudentId_fkey" FOREIGN KEY ("convertedStudentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "referrals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_badges" ADD CONSTRAINT "student_badges_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_badges" ADD CONSTRAINT "student_badges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_responsibleStaffId_fkey" FOREIGN KEY ("responsibleStaffId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interventions" ADD CONSTRAINT "interventions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "engagement_scores" ADD CONSTRAINT "engagement_scores_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

