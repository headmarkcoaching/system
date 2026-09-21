"use client";

import * as React from "react";
import { toast } from "sonner";
import { Target, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { ProgressBar } from "@/components/shared/progress-bar";
import { EntityDialog, type FieldDef } from "@/components/shared/entity-dialog";
import { formatDate } from "@/lib/utils";
import { createGoalAction, cancelGoalAction } from "./goals-actions";
import type { GoalWithProgress } from "@/lib/services/goals";

const TYPE_OPTIONS = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "EXAM", label: "Exam" },
];
const METRIC_OPTIONS = [
  { value: "SUBJECT_TEST_SCORE", label: "Subject Test Score" },
  { value: "OVERALL_PERFORMANCE", label: "Overall Performance" },
  { value: "ATTENDANCE", label: "Attendance" },
  { value: "HOMEWORK_COMPLETION", label: "Homework Completion" },
];

export function GoalsCard({ studentId, goals, subjects, canManage }: { studentId: string; goals: GoalWithProgress[]; subjects: { id: string; name: string }[]; canManage: boolean }) {
  const fields: FieldDef[] = [
    { type: "select", name: "type", label: "Goal Type", required: true, options: TYPE_OPTIONS },
    { type: "select", name: "metric", label: "Metric", required: true, options: METRIC_OPTIONS },
    { type: "select", name: "subjectId", label: "Subject (only for Subject Test Score)", options: subjects.map((s) => ({ value: s.id, label: s.name })) },
    { type: "text", name: "title", label: "Title", required: true, placeholder: "Improve Mathematics score from 55% to 70%" },
    { type: "number", name: "targetValue", label: "Target Value (%)", required: true },
    { type: "text", name: "targetDate", label: "Target Date (YYYY-MM-DD)", required: true, placeholder: "2026-10-01" },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4 text-primary" /> Goals
        </CardTitle>
        {canManage && (
          <EntityDialog
            trigger={
              <Button size="sm" variant="outline">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Goal
              </Button>
            }
            title="Set a Goal"
            fields={fields}
            onSubmit={(data) => createGoalAction(studentId, data)}
          />
        )}
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <EmptyState title="No goals set yet" className="py-6" />
        ) : (
          <ul className="space-y-3">
            {goals.map((g) => (
              <li key={g.id} className="space-y-2 rounded-md border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{g.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {TYPE_OPTIONS.find((t) => t.value === g.type)?.label} · {g.subject?.name ?? METRIC_OPTIONS.find((m) => m.value === g.metric)?.label} · target by {formatDate(g.targetDate)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={g.effectiveStatus} />
                    {canManage && g.effectiveStatus === "ACTIVE" && <CancelGoalButton goalId={g.id} studentId={studentId} />}
                  </div>
                </div>
                <ProgressBar label={`${g.startValue}% → ${g.targetValue}%`} value={Math.min(100, Math.round((g.currentValue / g.targetValue) * 100))} />
                <p className="text-xs text-muted-foreground">Currently at {g.currentValue}%</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function CancelGoalButton({ goalId, studentId }: { goalId: string; studentId: string }) {
  const [pending, setPending] = React.useState(false);

  async function handleCancel() {
    setPending(true);
    try {
      await cancelGoalAction(goalId, studentId);
      toast.success("Goal cancelled");
    } catch {
      toast.error("Could not cancel.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancel} disabled={pending}>
      <X className="h-3.5 w-3.5" />
    </Button>
  );
}
