"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { suggestedDuration } from "@/lib/practice";
import { startPracticeAction } from "../actions";

type Mode = "PRACTICE" | "EXAM";

export function StartForm({
  subjectId,
  scope,
  chapterId,
  blockKey,
  pastPaperId,
  available,
  defaultCount,
  paperMinutes,
}: {
  subjectId: string;
  scope: "CHAPTER" | "QUARTER" | "HALF" | "FULL" | "PAST_PAPER" | "WEAK_AREAS";
  chapterId?: string;
  blockKey?: string;
  pastPaperId?: string;
  available: number;
  defaultCount: number;
  paperMinutes?: number;
}) {
  const router = useRouter();
  const isPaper = scope === "PAST_PAPER";
  const [mode, setMode] = React.useState<Mode>(isPaper || scope !== "CHAPTER" ? "EXAM" : "PRACTICE");
  const [count, setCount] = React.useState(Math.max(1, Math.min(defaultCount, available || defaultCount)));
  const [difficulty, setDifficulty] = React.useState<"MIXED" | "EASY" | "MEDIUM" | "HARD">("MIXED");
  const [objectiveOnly, setObjectiveOnly] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const effectiveMode: Mode = isPaper ? "EXAM" : mode;
  const minutes = isPaper ? paperMinutes : suggestedDuration(count);

  async function handleStart() {
    setPending(true);
    try {
      const result = await startPracticeAction({
        subjectId,
        scope,
        mode: effectiveMode,
        chapterId,
        blockKey,
        pastPaperId,
        ...(isPaper ? {} : { count, difficulty, objectiveOnly }),
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.push(`/student/practice/${result.sessionId}`);
    } catch {
      toast.error("Couldn't build that paper. Please try again.");
    } finally {
      setPending(false);
    }
  }

  const modes: { value: Mode; title: string; body: string; icon: typeof Clock }[] = [
    { value: "PRACTICE", title: "Practice", body: "No timer. Check each answer straight away and read the explanation.", icon: Lightbulb },
    { value: "EXAM", title: "Exam", body: "Timed, like the real thing. Answers and explanations come at the end.", icon: Clock },
  ];

  return (
    <div className="space-y-6">
      {!isPaper && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">How do you want to work?</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {modes.map((m) => (
              <label
                key={m.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  mode === m.value ? "border-primary bg-primary/[0.05]" : "border-border hover:bg-accent"
                )}
              >
                <input type="radio" name="mode" value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)} className="sr-only" />
                <m.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  <span className="block font-semibold">{m.title}</span>
                  <span className="block text-sm text-muted-foreground">{m.body}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {!isPaper && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="count">Number of questions</Label>
            <Input id="count" type="number" min={1} max={Math.max(1, available)} value={count} onChange={(e) => setCount(Math.max(1, Math.min(Number(e.target.value) || 1, Math.max(1, available))))} />
            <p className="text-xs text-muted-foreground">Up to {available} available for this choice.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="difficulty">Difficulty</Label>
            <Select value={difficulty} onValueChange={(v) => setDifficulty(v as typeof difficulty)}>
              <SelectTrigger id="difficulty">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MIXED">Mixed</SelectItem>
                <SelectItem value="EASY">Easy</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HARD">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm sm:col-span-2">
            <input type="checkbox" checked={objectiveOnly} onChange={(e) => setObjectiveOnly(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
            Only multiple-choice and numerical questions (marked for you automatically)
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-4">
        <p className="text-sm text-muted-foreground">
          {effectiveMode === "EXAM" && minutes ? (
            <>
              Timed: about <span className="font-semibold text-foreground">{minutes} minutes</span>. The paper submits itself when time is up.
            </>
          ) : (
            "No time limit. Finish when you're ready."
          )}
        </p>
        <Button onClick={handleStart} disabled={pending || available === 0} size="lg">
          {pending ? "Building your paper…" : "Start"}
        </Button>
      </div>
    </div>
  );
}
