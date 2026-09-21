import { PageHeader } from "@/components/shared/page-header";
import * as gamificationService from "@/lib/services/gamification";
import { PointsConfigForm } from "./config-form";

export default async function GamificationSettingsPage() {
  const config = await gamificationService.getPointsConfig();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Gamification Points" description="Configure how many points students earn for each achievement academy-wide." />
      <PointsConfigForm
        config={{
          pointsForAttendance: config.pointsForAttendance,
          pointsForPerfectWeek: config.pointsForPerfectWeek,
          pointsForHomeworkSubmit: config.pointsForHomeworkSubmit,
          pointsForHomeworkReviewed: config.pointsForHomeworkReviewed,
          pointsForHighTestScore: config.pointsForHighTestScore,
          highTestScoreThreshold: config.highTestScoreThreshold,
          pointsForParticipation: config.pointsForParticipation,
          pointsForStudyStreak: config.pointsForStudyStreak,
          studyStreakDays: config.studyStreakDays,
        }}
      />
    </div>
  );
}
