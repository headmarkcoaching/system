"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageCircleQuestion } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { answersMatch, isObjectiveType } from "@/lib/practice";
import { selfMarkAction } from "../actions";

export interface ReviewQuestion {
  id: string;
  chapterNumber: number;
  chapterTitle: string;
  type: string;
  questionText: string;
  options: string[] | null;
  marks: number;
  correctAnswer: string | null;
  explanation: string | null;
  given: string;
  marksAwarded: number | null;
  selfMarked: boolean;
}

export interface BreakdownRow {
  chapterNumber: number;
  chapterTitle: string;
  earned: number;
  possible: number;
  pending: number;
}

type Filter = "ALL" | "REVIEW";

export function PracticeReview({
  sessionId,
  subjectId,
  scopeLabel,
  mode,
  marksObtained,
  totalMarks,
  minutesTaken,
  passPercent,
  questions,
  breakdown,
}: {
  sessionId: string;
  subjectId: string;
  scopeLabel: string;
  mode: "PRACTICE" | "EXAM";
  marksObtained: number;
  totalMarks: number;
  minutesTaken: number | null;
  passPercent: number;
  questions: ReviewQuestion[];
  breakdown: BreakdownRow[];
}) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<Filter>("ALL");
  const [marks, setMarks] = React.useState<Record<string, number | undefined>>(() =>
    Object.fromEntries(questions.filter((q) => !isObjectiveType(q.type) && q.marksAwarded !== null).map((q) => [q.id, q.marksAwarded as number]))
  );
  const [saving, setSaving] = React.useState(false);

  const percent = totalMarks ? Math.round((marksObtained / totalMarks) * 100) : 0;
  const unmarkedWritten = questions.filter((q) => !isObjectiveType(q.type) && q.marksAwarded === null).length;
  const writtenCount = questions.filter((q) => !isObjectiveType(q.type)).length;

  function needsReview(q: ReviewQuestion) {
    if (!isObjectiveType(q.type)) return q.marksAwarded === null || q.marksAwarded < q.marks;
    return !answersMatch(q.type, q.given, q.correctAnswer);
  }
  const shown = filter === "REVIEW" ? questions.filter(needsReview) : questions;

  async function saveMarks() {
    const payload: Record<string, number> = {};
    for (const q of questions) {
      const v = marks[q.id];
      if (!isObjectiveType(q.type) && v !== undefined) payload[q.id] = v;
    }
    setSaving(true);
    try {
      const result = await selfMarkAction(sessionId, payload);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Marks saved");
      router.refresh();
    } catch {
      toast.error("Couldn't save your marks. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {scopeLabel} · {mode === "EXAM" ? "Timed exam" : "Practice"}
            {minutesTaken !== null ? ` · ${minutesTaken} min` : ""}
          </p>
          <p className="text-4xl font-bold tabular-nums">
            {marksObtained} <span className="text-lg text-muted-foreground">/ {totalMarks}</span>
          </p>
          <Badge variant={percent >= passPercent ? "success" : percent >= 40 ? "warning" : "destructive"} className="text-sm">
            {percent}%
          </Badge>
          {unmarkedWritten > 0 && (
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              This score covers the auto-marked questions only. Mark your {unmarkedWritten} written answer{unmarkedWritten === 1 ? "" : "s"} below against the model answers to finish it.
            </p>
          )}
        </CardContent>
      </Card>

      <section aria-labelledby="by-chapter" className="space-y-3">
        <h2 id="by-chapter" className="font-display text-lg font-semibold">
          How you did, chapter by chapter
        </h2>
        <ul className="space-y-2.5 rounded-xl border border-border bg-card p-4">
          {breakdown.map((b) => {
            const pct = b.possible ? Math.round((b.earned / b.possible) * 100) : null;
            return (
              <li key={b.chapterNumber} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(0,14rem)_1fr_auto]">
                <span className="truncate text-sm font-medium">
                  Chapter {b.chapterNumber}: {b.chapterTitle}
                </span>
                <span className="font-ledger text-sm tabular-nums text-muted-foreground sm:order-3">
                  {b.earned}/{b.possible}
                  {b.pending > 0 ? ` +${b.pending} to mark` : ""}
                </span>
                <div className="col-span-2 h-2 overflow-hidden rounded-full bg-muted sm:order-2 sm:col-span-1" role="img" aria-label={pct !== null ? `${pct} percent` : "Not marked yet"}>
                  <div className={cn("h-full rounded-full", pct === null ? "bg-muted-foreground/30" : pct >= passPercent ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-destructive")} style={{ width: `${pct ?? 0}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="answers" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="answers" className="font-display text-lg font-semibold">
            Your answers
          </h2>
          <div role="tablist" aria-label="Filter answers" className="flex gap-1.5">
            {(["ALL", "REVIEW"] as Filter[]).map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-accent")}
              >
                {f === "ALL" ? `All (${questions.length})` : `To review (${questions.filter(needsReview).length})`}
              </button>
            ))}
          </div>
        </div>

        {shown.length === 0 && <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nothing to review. Every answer was right.</p>}

        {shown.map((q) => {
          const number = questions.indexOf(q) + 1;
          const objective = isObjectiveType(q.type);
          const isCorrect = objective && answersMatch(q.type, q.given, q.correctAnswer);
          const doubtHref = `/student/doubts/new?${new URLSearchParams({ subjectId, chapter: `Chapter ${q.chapterNumber}`, title: `Question ${number}: ${q.questionText}`.slice(0, 140) }).toString()}`;
          return (
            <Card key={q.id}>
              <CardContent className="space-y-3 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">
                    {number}. {q.questionText}
                  </p>
                  <Badge variant={objective ? (isCorrect ? "success" : "destructive") : q.marksAwarded === null ? "secondary" : q.marksAwarded === q.marks ? "success" : "warning"} className="shrink-0">
                    {q.marksAwarded ?? "-"} / {q.marks}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Chapter {q.chapterNumber}: {q.chapterTitle}
                </p>

                {q.options ? (
                  <ul className="space-y-1 text-sm">
                    {q.options.map((opt) => {
                      const isGiven = q.given === opt;
                      const isRight = q.correctAnswer === opt;
                      return (
                        <li key={opt} className={cn("rounded-md border px-2.5 py-1.5", isRight ? "border-success/40 bg-success/10 text-success" : isGiven ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-transparent text-muted-foreground")}>
                          {opt}
                          {isGiven && " (your answer)"}
                          {isRight && !isGiven && " (correct answer)"}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="space-y-1.5 text-sm">
                    <p>
                      <span className="text-muted-foreground">Your answer: </span>
                      {q.given || "Not answered"}
                    </p>
                    {q.correctAnswer && (
                      <p>
                        <span className="text-muted-foreground">{objective ? "Correct answer: " : "Model answer: "}</span>
                        <span className={objective ? "text-success" : ""}>{q.correctAnswer}</span>
                      </p>
                    )}
                  </div>
                )}

                {q.explanation && (
                  <p className="rounded-lg bg-muted/50 p-3 text-sm">
                    <span className="font-semibold">Explanation: </span>
                    {q.explanation}
                  </p>
                )}

                {!objective && (
                  <fieldset className="space-y-1.5">
                    <legend className="text-xs font-medium text-muted-foreground">Mark your own answer against the model answer</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: q.marks + 1 }, (_, v) => v).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setMarks((m) => ({ ...m, [q.id]: v }))}
                          aria-pressed={marks[q.id] === v}
                          className={cn("h-8 min-w-8 rounded-md border px-2 text-sm font-medium tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", marks[q.id] === v ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent")}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}

                {needsReview(q) && (
                  <Link href={doubtHref} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                    <MessageCircleQuestion className="h-3.5 w-3.5" aria-hidden="true" /> Still confused? Ask a doubt about this
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}

        {writtenCount > 0 && (
          <div className="flex justify-end">
            <Button onClick={saveMarks} disabled={saving || Object.keys(marks).length === 0}>
              {saving ? "Saving…" : "Save my marks"}
            </Button>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <Button asChild>
          <Link href={`/student/practice?subject=${subjectId}`}>Back to practice</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/student/practice/start?subject=${subjectId}&scope=WEAK_AREAS`}>Practise my weak areas</Link>
        </Button>
      </div>
    </div>
  );
}
