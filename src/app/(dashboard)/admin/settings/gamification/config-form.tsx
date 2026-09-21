"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updatePointsConfigAction } from "./actions";

interface ConfigValues {
  pointsForAttendance: number;
  pointsForPerfectWeek: number;
  pointsForHomeworkSubmit: number;
  pointsForHomeworkReviewed: number;
  pointsForHighTestScore: number;
  highTestScoreThreshold: number;
  pointsForParticipation: number;
  pointsForStudyStreak: number;
  studyStreakDays: number;
}

export function PointsConfigForm({ config }: { config: ConfigValues }) {
  const [values, setValues] = React.useState<ConfigValues>(config);
  const [pending, setPending] = React.useState(false);

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
      const result = await updatePointsConfigAction(values as unknown as Record<string, unknown>);
      if (result?.error) toast.error(result.error);
      else toast.success("Gamification points updated");
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
          <CardTitle>Attendance Points</CardTitle>
          <CardDescription>Points awarded for attendance-related achievements.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Present in a class" {...field("pointsForAttendance")} />
          <Field label="Perfect week bonus" {...field("pointsForPerfectWeek")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Homework Points</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="On submission" {...field("pointsForHomeworkSubmit")} />
          <Field label="On being reviewed" {...field("pointsForHomeworkReviewed")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tests & Participation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="High test score bonus" {...field("pointsForHighTestScore")} />
          <Field label="High score threshold %" {...field("highTestScoreThreshold")} />
          <Field label="Class participation" {...field("pointsForParticipation")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Study Streak</CardTitle>
          <CardDescription>Consecutive-day attendance streak bonus.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Streak bonus points" {...field("pointsForStudyStreak")} />
          <Field label="Streak length (days)" {...field("studyStreakDays")} />
        </CardContent>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save Points"}
      </Button>
    </form>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type="number" min={0} value={value} onChange={onChange} />
    </div>
  );
}
