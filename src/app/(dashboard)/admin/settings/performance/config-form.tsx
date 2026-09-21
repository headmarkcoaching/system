"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updatePerformanceConfigAction } from "./actions";

interface ConfigValues {
  attendanceWeight: number;
  homeworkWeight: number;
  testWeight: number;
  participationWeight: number;
  excellentThreshold: number;
  progressingThreshold: number;
  needsAttentionThreshold: number;
  atRiskAttendanceBelow: number;
  atRiskHomeworkBelow: number;
  atRiskTestBelow: number;
}

export function PerformanceConfigForm({ config }: { config: ConfigValues }) {
  const [values, setValues] = React.useState<ConfigValues>(config);
  const [pending, setPending] = React.useState(false);

  const weightSum = values.attendanceWeight + values.homeworkWeight + values.testWeight + values.participationWeight;

  function field(name: keyof ConfigValues) {
    return {
      value: values[name],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [name]: Number(e.target.value) })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const result = await updatePerformanceConfigAction(values as unknown as Record<string, unknown>);
      if (result?.error) toast.error(result.error);
      else toast.success("Performance rules updated");
    } catch {
      toast.error("Could not save changes.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Score Weights</CardTitle>
          <CardDescription>How much each factor counts toward the 100-point Academic Performance Score. Must add up to 100.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <Field label="Attendance %" {...field("attendanceWeight")} />
          <Field label="Homework %" {...field("homeworkWeight")} />
          <Field label="Tests %" {...field("testWeight")} />
          <Field label="Participation %" {...field("participationWeight")} />
          <p className={`sm:col-span-4 text-sm ${weightSum === 100 ? "text-success" : "text-destructive"}`}>Total: {weightSum} / 100</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Performance Categories</CardTitle>
          <CardDescription>Minimum overall score required for each category.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Excellent ≥" {...field("excellentThreshold")} />
          <Field label="Progressing ≥" {...field("progressingThreshold")} />
          <Field label="Needs Attention ≥" {...field("needsAttentionThreshold")} />
          <p className="sm:col-span-3 text-xs text-muted-foreground">Below &quot;Needs Attention&quot; is automatically At Risk.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>At-Risk Rules</CardTitle>
          <CardDescription>A student is flagged At Risk immediately if any of these are breached, regardless of overall score.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Attendance below" {...field("atRiskAttendanceBelow")} />
          <Field label="Homework below" {...field("atRiskHomeworkBelow")} />
          <Field label="Test average below" {...field("atRiskTestBelow")} />
        </CardContent>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save Rules"}
      </Button>
    </form>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type="number" min={0} max={100} value={value} onChange={onChange} />
    </div>
  );
}
