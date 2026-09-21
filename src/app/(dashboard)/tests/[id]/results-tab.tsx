import { StatCard } from "@/components/shared/stat-card";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, TrendingDown } from "lucide-react";
import type { QuestionAnalyticsRow } from "@/lib/services/analytics";
import { DifficultQuestionsAICard } from "./difficult-questions-ai-card";

interface ResultRow {
  id: string;
  marksObtained: number;
  totalMarks: number;
  gradedAt: Date | null;
  student: { fullName: string; studentCode: string };
}

export function ResultsTab({
  testId,
  stats,
  results,
  questionAnalytics,
  canManage,
  initialExplanation,
}: {
  testId: string;
  stats: { average: number; highest: number; lowest: number; gradedCount: number };
  results: ResultRow[];
  questionAnalytics: QuestionAnalyticsRow[];
  canManage: boolean;
  initialExplanation: string | null;
}) {
  const columns: DataTableColumn<ResultRow>[] = [
    { key: "student", header: "Student", cell: (r) => `${r.student.fullName} (${r.student.studentCode})` },
    { key: "marks", header: "Marks", cell: (r) => `${r.marksObtained} / ${r.totalMarks}` },
    { key: "percent", header: "%", cell: (r) => `${Math.round((r.marksObtained / r.totalMarks) * 100)}%` },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.gradedAt ? "REVIEWED" : "PENDING"} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Class Average" value={stats.average} icon={Target} />
        <StatCard label="Highest" value={stats.highest} icon={TrendingUp} tone="success" />
        <StatCard label="Lowest" value={stats.lowest} icon={TrendingDown} tone={stats.lowest < 40 ? "destructive" : "default"} />
      </div>
      <DataTable columns={columns} data={results} rowKey={(r) => r.id} emptyTitle="No submissions yet" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Question Analytics</CardTitle>
          <CardDescription>Per-question correctness (MCQ/Numerical) or average score (Short/Long Answer). Questions below 40% are flagged as difficult.</CardDescription>
        </CardHeader>
        <CardContent>
          {questionAnalytics.length === 0 ? (
            <EmptyState title="No answers submitted yet" className="py-6" />
          ) : (
            <ul className="space-y-2">
              {questionAnalytics.map((q, i) => (
                <li key={q.questionId} className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">
                      Question {i + 1}. {q.questionText}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {q.totalAnswers} answer{q.totalAnswers === 1 ? "" : "s"} · {q.type.replace("_", " ").toLowerCase()}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {q.isDifficult && <Badge variant="destructive">Difficult</Badge>}
                    <Badge variant={q.scorePercent === null ? "outline" : q.scorePercent >= 70 ? "success" : q.scorePercent >= 40 ? "warning" : "destructive"}>
                      {q.scorePercent === null ? "—" : `${q.scorePercent}%`}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canManage && questionAnalytics.some((q) => q.isDifficult) && <DifficultQuestionsAICard testId={testId} initialExplanation={initialExplanation} />}
    </div>
  );
}
