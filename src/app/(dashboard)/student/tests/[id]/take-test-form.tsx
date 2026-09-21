"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { submitTestAttemptAction } from "@/app/(dashboard)/tests/actions";

interface Question {
  id: string;
  type: string;
  questionText: string;
  options: string[] | null;
  marks: number;
}

export function TakeTestForm({
  testId,
  attemptId,
  title,
  startedAt,
  durationMinutes,
  questions,
}: {
  testId: string;
  attemptId: string;
  title: string;
  startedAt: string;
  durationMinutes: number;
  questions: Question[];
}) {
  const router = useRouter();
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const submittedRef = React.useRef(false);

  const deadline = React.useMemo(() => new Date(startedAt).getTime() + durationMinutes * 60_000, [startedAt, durationMinutes]);
  const [remainingMs, setRemainingMs] = React.useState(() => Math.max(0, deadline - Date.now()));

  const handleSubmit = React.useCallback(
    async (auto: boolean) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      try {
        await submitTestAttemptAction(testId, attemptId, answers);
        if (auto) toast.info("Time's up — your test was submitted automatically.");
        else toast.success("Test submitted");
        router.refresh();
      } catch {
        toast.error("Could not submit the test. Please try again.");
        submittedRef.current = false;
        setSubmitting(false);
      }
    },
    [answers, attemptId, router, testId]
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, deadline - Date.now());
      setRemainingMs(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        handleSubmit(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline, handleSubmit]);

  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  const urgent = remainingMs < 60_000;

  return (
    <div className="space-y-4">
      <div className={`sticky top-16 z-10 flex items-center justify-between rounded-lg border p-3 ${urgent ? "border-destructive bg-destructive/10" : "border-border bg-card"}`}>
        <p className="font-semibold">{title}</p>
        <div className={`flex items-center gap-1.5 font-mono text-sm font-bold ${urgent ? "text-destructive" : ""}`}>
          <Clock className="h-4 w-4" />
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </div>
      </div>

      <div className="space-y-3">
        {questions.map((q, idx) => (
          <Card key={q.id}>
            <CardContent className="space-y-2 p-4">
              <p className="text-sm font-medium">
                {idx + 1}. {q.questionText} <span className="text-xs text-muted-foreground">({q.marks} marks)</span>
              </p>

              {q.type === "MCQ" && q.options ? (
                <div className="space-y-1.5">
                  {q.options.map((opt) => (
                    <label key={opt} className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
                      <input
                        type="radio"
                        name={q.id}
                        value={opt}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : q.type === "NUMERICAL" ? (
                <Input value={answers[q.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} placeholder="Your answer" />
              ) : (
                <Textarea value={answers[q.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} placeholder="Your answer" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">
          {Object.keys(answers).length} / {questions.length} answered
        </Label>
        <Button onClick={() => handleSubmit(false)} disabled={submitting} size="lg">
          {submitting ? "Submitting…" : "Submit Test"}
        </Button>
      </div>
    </div>
  );
}
