import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import type { PracticeScoreRow } from "@/lib/services/practice";

/** Practice paper scores for a parent or teacher. Scores only: the questions and answers stay
 * with the student. Passing at 70% matches the student's own practice screens. */
export function PracticeScoresCard({
  recent,
  weekCount,
  weekAveragePercent,
  title = "Practice Tests",
}: {
  recent: PracticeScoreRow[];
  weekCount: number;
  weekAveragePercent: number | null;
  title?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {recent.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {weekCount === 0
              ? "No practice papers this week."
              : `${weekCount} ${weekCount === 1 ? "paper" : "papers"} this week${weekAveragePercent !== null ? `, average ${weekAveragePercent}%` : ""}.`}
          </p>
        )}
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <EmptyState title="No practice papers yet" description="Scores appear here once your child finishes a practice paper." className="py-6" />
        ) : (
          <ul className="space-y-2">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate">
                    {r.scopeLabel} <span className="text-muted-foreground">· {r.subjectName}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(r.submittedAt)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {r.markingPending && <span className="text-xs text-muted-foreground">Marking pending</span>}
                  <Badge variant={r.percent >= 70 ? "success" : r.percent >= 40 ? "warning" : "destructive"}>
                    {r.marksObtained}/{r.totalMarks} ({r.percent}%)
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
