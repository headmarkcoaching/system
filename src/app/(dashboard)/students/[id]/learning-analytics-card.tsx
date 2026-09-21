import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import type { SubjectBreakdownRow, ChapterBreakdownRow, TopicBreakdownRow } from "@/lib/services/learning-analytics";

function scoreTone(average: number) {
  if (average >= 70) return "success" as const;
  if (average >= 40) return "warning" as const;
  return "destructive" as const;
}

function BreakdownList({ rows, renderLabel, countLabel }: { rows: { average: number; label: string; count: number }[]; renderLabel: (r: { label: string }) => string; countLabel: string }) {
  if (rows.length === 0) return <EmptyState title="No graded data yet" className="py-4" />;
  return (
    <ul className="space-y-1.5">
      {rows.slice(0, 8).map((r, i) => (
        <li key={i} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
          <span className="min-w-0 truncate">{renderLabel(r)}</span>
          <span className="flex shrink-0 items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {r.count} {countLabel}
            </span>
            <Badge variant={scoreTone(r.average)}>{r.average}%</Badge>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Per-student Subject/Chapter/Topic performance breakdown (weakest first) — distinct from
 * analytics.ts's academy-wide academicAnalytics(), which is admin-facing and aggregated across
 * all students. Purely factual/derived data (no AI), so it's safe to show to the student
 * themself as well as staff — unlike the Predictive Risk score on the Engagement tab. */
export function LearningAnalyticsCard({
  data,
}: {
  data: { subjects: SubjectBreakdownRow[]; chapters: ChapterBreakdownRow[]; topics: TopicBreakdownRow[] };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4 text-primary" /> Learning Analytics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">By Subject</h4>
          <BreakdownList
            rows={data.subjects.map((s) => ({ label: s.subjectName, average: s.average, count: s.testCount }))}
            renderLabel={(r) => r.label}
            countLabel="tests"
          />
        </div>
        <div>
          <h4 className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">By Chapter (weakest first)</h4>
          <BreakdownList
            rows={data.chapters.map((c) => ({ label: `${c.subjectName} — ${c.chapter}`, average: c.average, count: c.testCount }))}
            renderLabel={(r) => r.label}
            countLabel="tests"
          />
        </div>
        <div>
          <h4 className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">By Topic (weakest first)</h4>
          {data.topics.length === 0 ? (
            <EmptyState title="No topic-tagged questions graded yet" description="Tag questions with a Topic on the test's Questions tab to enable this." className="py-4" />
          ) : (
            <BreakdownList
              rows={data.topics.map((t) => ({ label: `${t.subjectName} — ${t.topic}`, average: t.average, count: t.questionCount }))}
              renderLabel={(r) => r.label}
              countLabel="questions"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
