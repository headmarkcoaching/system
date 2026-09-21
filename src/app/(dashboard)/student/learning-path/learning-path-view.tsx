import { CheckCircle2, Circle, MinusCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressBar } from "@/components/shared/progress-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterSelect } from "@/components/shared/filter-bar";
import type { LearningPathChapter, LearningPathStep } from "@/lib/services/learning-path";

function StepIcon({ status }: { status: LearningPathStep["status"] }) {
  if (status === "COMPLETE") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (status === "NOT_AVAILABLE") return <MinusCircle className="h-4 w-4 text-muted-foreground/40" />;
  return <Circle className="h-4 w-4 text-muted-foreground" />;
}

export function LearningPathView({
  subjects,
  selectedSubjectId,
  chapters,
  overallPercent,
}: {
  subjects: { id: string; name: string }[];
  selectedSubjectId: string;
  chapters: LearningPathChapter[];
  overallPercent: number;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterSelect paramKey="subject" placeholder="Select subject" defaultValue={selectedSubjectId} options={subjects.map((s) => ({ value: s.id, label: s.name }))} />
        <div className="w-full sm:w-64">
          <ProgressBar label="Overall progress" value={overallPercent} />
        </div>
      </div>

      {chapters.length === 0 ? (
        <EmptyState title="No chapter-tagged content for this subject yet" description="A learning path builds itself once classes, notes, homework, or tests are tagged with a chapter." />
      ) : (
        <div className="space-y-3">
          {chapters.map((c) => (
            <Card key={c.chapter}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{c.chapter}</CardTitle>
                <span className="text-xs text-muted-foreground">
                  {c.completedSteps}/{c.totalSteps} steps
                </span>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4">
                  {c.steps.map((s, i) => (
                    <div key={s.key} className="flex items-center gap-2">
                      <StepIcon status={s.status} />
                      <span className={`text-sm ${s.status === "NOT_AVAILABLE" ? "text-muted-foreground/50" : ""}`}>{s.label}</span>
                      {i < c.steps.length - 1 && <span className="text-muted-foreground/30">→</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
