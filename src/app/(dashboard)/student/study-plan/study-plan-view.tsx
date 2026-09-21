"use client";

import * as React from "react";
import { toast } from "sonner";
import { RefreshCw, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { generateStudyPlanAction } from "./actions";

export function StudyPlanView({ initialPlan }: { initialPlan: { plan: string; generatedAt: Date } | null }) {
  const [plan, setPlan] = React.useState(initialPlan);
  const [pending, setPending] = React.useState(false);
  const [autoGenerateAttempted, setAutoGenerateAttempted] = React.useState(false);

  const handleGenerate = React.useCallback(async (force: boolean) => {
    setPending(true);
    try {
      const result = await generateStudyPlanAction(force);
      setPlan({ plan: result.plan, generatedAt: result.generatedAt });
      if (force) toast.success("Study plan regenerated");
    } catch {
      toast.error("Couldn't generate a study plan. Please try again.");
    } finally {
      setPending(false);
    }
  }, []);

  React.useEffect(() => {
    if (!plan && !autoGenerateAttempted) {
      setAutoGenerateAttempted(true);
      handleGenerate(false);
    }
  }, [plan, autoGenerateAttempted, handleGenerate]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListTodo className="h-4 w-4 text-primary" /> Today&apos;s Study Plan
        </CardTitle>
        <Button variant="outline" size="sm" onClick={() => handleGenerate(true)} disabled={pending}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} /> {pending ? "Generating…" : "Regenerate"}
        </Button>
      </CardHeader>
      <CardContent>
        {!plan ? (
          <EmptyState title={pending ? "Generating your study plan…" : "No study plan yet"} className="py-8" />
        ) : (
          <div className="space-y-2">
            <p className="whitespace-pre-wrap text-sm">{plan.plan}</p>
            <p className="text-xs text-muted-foreground">Generated {formatDate(plan.generatedAt)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
