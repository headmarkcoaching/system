"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, Eye, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { answersMatch, isObjectiveType } from "@/lib/practice";
import { submitPracticeAction } from "../actions";

export interface RunnerQuestion {
  id: string;
  chapterLabel: string;
  type: string;
  questionText: string;
  options: string[] | null;
  marks: number;
  /** Sent only in practice mode, where answers are checked as you go. Never sent for an exam. */
  correctAnswer?: string | null;
  explanation?: string | null;
}

interface Draft {
  answers: Record<string, string>;
  checked: string[];
  index: number;
}

export function PracticeRunner({
  sessionId,
  mode,
  title,
  startedAt,
  durationMinutes,
  questions,
}: {
  sessionId: string;
  mode: "PRACTICE" | "EXAM";
  title: string;
  startedAt: string;
  durationMinutes: number | null;
  questions: RunnerQuestion[];
}) {
  const router = useRouter();
  const storageKey = `practice-draft:${sessionId}`;
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [checked, setChecked] = React.useState<Set<string>>(new Set());
  const [index, setIndex] = React.useState(0);
  const [confirming, setConfirming] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [restored, setRestored] = React.useState(false);
  const submittedRef = React.useRef(false);
  const answersRef = React.useRef(answers);
  answersRef.current = answers;

  // Restore any unsaved progress from this browser, so a refresh never loses the paper.
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const draft = JSON.parse(raw) as Draft;
        setAnswers(draft.answers ?? {});
        setChecked(new Set(draft.checked ?? []));
        setIndex(Math.min(Math.max(0, draft.index ?? 0), questions.length - 1));
      }
    } catch {
      /* A blocked or corrupt store just means starting fresh. */
    }
    setRestored(true);
  }, [storageKey, questions.length]);

  React.useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ answers, checked: Array.from(checked), index } satisfies Draft));
    } catch {
      /* Storage full or blocked: the paper still works, it just won't survive a refresh. */
    }
  }, [answers, checked, index, restored, storageKey]);

  const deadline = React.useMemo(() => (durationMinutes ? new Date(startedAt).getTime() + durationMinutes * 60_000 : null), [startedAt, durationMinutes]);
  // Starts empty and is filled in after mount. Reading the clock during the first render would give
  // the server and the browser different text and break hydration.
  const [remainingMs, setRemainingMs] = React.useState<number | null>(null);

  const submit = React.useCallback(
    async (auto: boolean) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      try {
        const result = await submitPracticeAction(sessionId, answersRef.current);
        if (result.error) {
          toast.error(result.error);
          submittedRef.current = false;
          setSubmitting(false);
          return;
        }
        try {
          localStorage.removeItem(storageKey);
        } catch {
          /* ignore */
        }
        if (auto) toast.info("Time's up. Your paper was submitted automatically.");
        router.refresh();
      } catch {
        toast.error("Couldn't submit. Please try again.");
        submittedRef.current = false;
        setSubmitting(false);
      }
    },
    [router, sessionId, storageKey]
  );

  React.useEffect(() => {
    if (!deadline || !restored) return;
    const tick = () => {
      const left = Math.max(0, deadline - Date.now());
      setRemainingMs(left);
      if (left <= 0) void submit(true);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [deadline, restored, submit]);

  const q = questions[index];
  const answered = questions.filter((x) => (answers[x.id] ?? "").trim() !== "").length;
  const isChecked = checked.has(q.id);
  const objective = isObjectiveType(q.type);
  const practiceMode = mode === "PRACTICE";
  const given = answers[q.id] ?? "";
  const correct = objective && practiceMode && isChecked && answersMatch(q.type, given, q.correctAnswer);

  const setAnswer = (value: string) => setAnswers((a) => ({ ...a, [q.id]: value }));
  const minutes = remainingMs !== null ? Math.floor(remainingMs / 60000) : 0;
  const seconds = remainingMs !== null ? Math.floor((remainingMs % 60000) / 1000) : 0;
  const urgent = remainingMs !== null && remainingMs < 60_000;

  return (
    <div className="space-y-4">
      <div className={cn("sticky top-16 z-10 flex items-center justify-between gap-3 rounded-lg border p-3", urgent ? "border-destructive bg-destructive/10" : "border-border bg-card")}>
        <div className="min-w-0">
          <p className="truncate font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">
            {answered} of {questions.length} answered · {practiceMode ? "Practice" : "Exam"}
          </p>
        </div>
        {deadline !== null && (
          <div className={cn("flex shrink-0 items-center gap-1.5 font-mono text-sm font-bold", urgent && "text-destructive")} role="timer" aria-label="Time remaining">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {remainingMs === null ? "--:--" : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`}
          </div>
        )}
      </div>

      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              Question {index + 1} of {questions.length} · {q.chapterLabel}
            </span>
            <span>
              {q.marks} mark{q.marks === 1 ? "" : "s"}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-base font-medium leading-relaxed">{q.questionText}</p>

          {q.type === "MCQ" && q.options ? (
            <div role="radiogroup" aria-label="Choose one answer" className="space-y-2">
              {q.options.map((opt) => {
                const selected = given === opt;
                const showRight = practiceMode && isChecked && opt === q.correctAnswer;
                const showWrong = practiceMode && isChecked && selected && opt !== q.correctAnswer;
                return (
                  <label
                    key={opt}
                    className={cn(
                      "flex items-center gap-3 rounded-lg border px-3.5 py-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                      isChecked ? "cursor-default" : "cursor-pointer hover:bg-accent",
                      showRight ? "border-success bg-success/10" : showWrong ? "border-destructive bg-destructive/10" : selected ? "border-primary bg-primary/[0.06]" : "border-border"
                    )}
                  >
                    <input type="radio" name={q.id} value={opt} checked={selected} disabled={isChecked} onChange={() => setAnswer(opt)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
                    <span className="flex-1">{opt}</span>
                    {showRight && <CheckCircle2 className="h-4 w-4 text-success" aria-label="Correct answer" />}
                    {showWrong && <XCircle className="h-4 w-4 text-destructive" aria-label="Your answer was wrong" />}
                  </label>
                );
              })}
            </div>
          ) : q.type === "NUMERICAL" ? (
            <Input value={given} onChange={(e) => setAnswer(e.target.value)} disabled={isChecked} inputMode="decimal" placeholder="Type your answer" aria-label="Your answer" className="max-w-xs" />
          ) : (
            <Textarea value={given} onChange={(e) => setAnswer(e.target.value)} placeholder="Write your answer here" rows={5} aria-label="Your answer" />
          )}

          {practiceMode && (
            <div className="space-y-3">
              {!isChecked && (
                <Button type="button" variant="outline" size="sm" onClick={() => setChecked((c) => new Set(c).add(q.id))} disabled={objective && given.trim() === ""}>
                  <Eye className="mr-1.5 h-4 w-4" aria-hidden="true" /> {objective ? "Check answer" : "Show model answer"}
                </Button>
              )}
              {isChecked && (
                <div className={cn("space-y-1.5 rounded-lg border p-3 text-sm", objective ? (correct ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10") : "border-border bg-muted/40")} aria-live="polite">
                  {objective && <p className="font-semibold">{correct ? "Correct" : `Not quite. The answer is ${q.correctAnswer}.`}</p>}
                  {!objective && q.correctAnswer && (
                    <p>
                      <span className="font-semibold">Model answer: </span>
                      {q.correctAnswer}
                    </p>
                  )}
                  {q.explanation && <p className="text-muted-foreground">{q.explanation}</p>}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" size="sm" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
              <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" /> Previous
            </Button>
            {index < questions.length - 1 ? (
              <Button type="button" size="sm" onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}>
                Next <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={() => setConfirming(true)}>
                Finish
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <nav aria-label="Question navigator" className="flex flex-wrap gap-1.5">
        {questions.map((x, i) => {
          const has = (answers[x.id] ?? "").trim() !== "";
          return (
            <button
              key={x.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Question ${i + 1}${has ? ", answered" : ", not answered"}`}
              aria-current={i === index ? "step" : undefined}
              className={cn(
                "h-9 w-9 rounded-md border text-sm font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                i === index ? "border-primary ring-2 ring-primary/40" : "border-border",
                has ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent"
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </nav>

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setConfirming(true)} disabled={submitting}>
          Submit paper
        </Button>
      </div>

      {confirming && (
        <div role="alertdialog" aria-labelledby="confirm-title" className="space-y-3 rounded-xl border-2 border-primary/40 bg-card p-5 shadow-lg">
          <p id="confirm-title" className="font-semibold">
            Submit this paper?
          </p>
          <p className="text-sm text-muted-foreground">
            You&apos;ve answered {answered} of {questions.length} questions.
            {answered < questions.length ? " Unanswered questions score zero." : ""} You can&apos;t change answers after submitting.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => submit(false)} disabled={submitting}>
              {submitting ? "Submitting…" : "Yes, submit"}
            </Button>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={submitting}>
              Keep working
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
