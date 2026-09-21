"use client";

import * as React from "react";
import { toast } from "sonner";
import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { gradeSubjectiveAction } from "@/app/(dashboard)/tests/actions";

interface Question {
  id: string;
  type: string;
  questionText: string;
  marks: number;
  order: number;
}

interface AnswerRecord {
  answer: string;
  marksAwarded: number | null;
}

interface Attempt {
  id: string;
  answers: unknown;
  submittedAt: Date | null;
  student: { id: string; fullName: string };
  result: { marksObtained: number; totalMarks: number; gradedAt: Date | null } | null;
}

export function GradingTab({ testId, attempts, questions, canManage }: { testId: string; attempts: Attempt[]; questions: Question[]; canManage: boolean }) {
  const [grading, setGrading] = React.useState<Attempt | null>(null);
  const subjectiveQuestions = questions.filter((q) => q.type === "SHORT_ANSWER" || q.type === "LONG_ANSWER");

  if (attempts.length === 0) {
    return <EmptyState title="No submissions yet" description="Attempts will appear here once students submit the test." />;
  }

  return (
    <div className="space-y-2">
      {attempts.map((attempt) => {
        const isGraded = Boolean(attempt.result?.gradedAt);
        return (
          <div key={attempt.id} className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="font-medium">{attempt.student.fullName}</p>
              <p className="text-xs text-muted-foreground">{attempt.result ? `${attempt.result.marksObtained} / ${attempt.result.totalMarks}` : "Submitted"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isGraded ? "success" : "warning"}>{isGraded ? "Graded" : "Pending Grading"}</Badge>
              {canManage && subjectiveQuestions.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => setGrading(attempt)}>
                  <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" /> Grade
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {grading && (
        <GradeAttemptDialog testId={testId} attempt={grading} subjectiveQuestions={subjectiveQuestions} onClose={() => setGrading(null)} />
      )}
    </div>
  );
}

function GradeAttemptDialog({
  testId,
  attempt,
  subjectiveQuestions,
  onClose,
}: {
  testId: string;
  attempt: Attempt;
  subjectiveQuestions: Question[];
  onClose: () => void;
}) {
  const answers = (attempt.answers as Record<string, AnswerRecord>) ?? {};
  const [marks, setMarks] = React.useState<Record<string, string>>(
    Object.fromEntries(subjectiveQuestions.map((q) => [q.id, answers[q.id]?.marksAwarded?.toString() ?? ""]))
  );
  const [pending, setPending] = React.useState(false);

  async function handleSave() {
    setPending(true);
    try {
      const grades = subjectiveQuestions.map((q) => ({ questionId: q.id, marksAwarded: Number(marks[q.id] || 0) }));
      const result = await gradeSubjectiveAction(testId, attempt.id, grades);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Grades saved");
        onClose();
      }
    } catch {
      toast.error("Could not save grades.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Grade — {attempt.student.fullName}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          {subjectiveQuestions.map((q, idx) => (
            <div key={q.id} className="space-y-1.5 rounded-md border border-border p-3">
              <p className="text-sm font-medium">
                {idx + 1}. {q.questionText} <span className="text-xs text-muted-foreground">({q.marks} marks)</span>
              </p>
              <p className="rounded-md bg-muted/50 px-3 py-2 text-sm">{answers[q.id]?.answer || <em className="text-muted-foreground">No answer given</em>}</p>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Marks awarded</Label>
                <Input
                  type="number"
                  min={0}
                  max={q.marks}
                  className="w-24"
                  value={marks[q.id] ?? ""}
                  onChange={(e) => setMarks((m) => ({ ...m, [q.id]: e.target.value }))}
                />
              </div>
            </div>
          ))}
        </div>
        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving…" : "Save Grades"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
