import { ProgressBar } from "@/components/shared/progress-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { RecalculateButton } from "./recalculate-button";
import { PerformanceAnalysisCard } from "./performance-analysis-card";
import { LearningAnalyticsCard } from "./learning-analytics-card";
import { GoalsCard } from "./goals-card";
import type { SubjectBreakdownRow, ChapterBreakdownRow, TopicBreakdownRow } from "@/lib/services/learning-analytics";
import type { GoalWithProgress } from "@/lib/services/goals";

interface PerformanceRecord {
  id: string;
  overallScore: number;
  category: string;
  attendanceScore: number;
  homeworkScore: number;
  testScore: number;
  participationScore: number;
  calculatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
}

export function PerformanceTab({
  studentId,
  batchId,
  latest,
  history,
  canManage,
  canGenerateAnalysis,
  initialAnalysis,
  learningAnalytics,
  goals,
  goalSubjects,
}: {
  studentId: string;
  batchId: string | null;
  latest: PerformanceRecord | null;
  history: PerformanceRecord[];
  canManage: boolean;
  canGenerateAnalysis: boolean;
  initialAnalysis: { analysis: string; generatedAt: Date } | null;
  learningAnalytics: { subjects: SubjectBreakdownRow[]; chapters: ChapterBreakdownRow[]; topics: TopicBreakdownRow[] };
  goals: GoalWithProgress[];
  goalSubjects: { id: string; name: string }[];
}) {
  return (
    <div className="space-y-6">
      {canManage && (
        <div className="flex justify-end">
          <RecalculateButton studentId={studentId} batchId={batchId} />
        </div>
      )}

      {!latest ? (
        <EmptyState
          title="No performance snapshot yet"
          description={canManage ? "Click Recalculate to generate one from the last 30 days of data." : "Ask the academy to generate this student's performance score."}
        />
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Overall Academic Performance Score · {formatDate(latest.periodStart)} – {formatDate(latest.periodEnd)}
              </p>
              <p className="text-5xl font-bold">{latest.overallScore}</p>
              <StatusBadge status={latest.category} />
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <ProgressBar label="Attendance" value={latest.attendanceScore} />
            <ProgressBar label="Homework" value={latest.homeworkScore} />
            <ProgressBar label="Tests" value={latest.testScore} />
            <ProgressBar label="Participation" value={latest.participationScore} />
          </div>

          <PerformanceAnalysisCard studentId={studentId} canGenerate={canGenerateAnalysis} initialAnalysis={initialAnalysis} />

          <div>
            <h3 className="mb-2 text-sm font-semibold">History</h3>
            <ul className="space-y-1.5">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span>{formatDate(h.calculatedAt)}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium">{h.overallScore}</span>
                    <StatusBadge status={h.category} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* Learning Analytics and Goals are derived from/track real data independent of whether
          a StudentPerformance snapshot has ever been calculated — so they render regardless
          of the `latest` guard above. */}
      <LearningAnalyticsCard data={learningAnalytics} />
      <GoalsCard studentId={studentId} goals={goals} subjects={goalSubjects} canManage={canManage} />
    </div>
  );
}
