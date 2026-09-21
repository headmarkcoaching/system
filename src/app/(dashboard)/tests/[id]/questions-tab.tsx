"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, X, Pencil, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EntityDialog, type FieldDef, type FieldValue } from "@/components/shared/entity-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { addQuestionAction, updateQuestionAction, deleteQuestionAction, generateQuestionDraftsAction } from "@/app/(dashboard)/tests/actions";
import type { DraftQuestion } from "@/lib/services/question-generation";

const TYPE_OPTIONS = [
  { value: "MCQ", label: "Multiple Choice" },
  { value: "SHORT_ANSWER", label: "Short Answer" },
  { value: "LONG_ANSWER", label: "Long Answer" },
  { value: "NUMERICAL", label: "Numerical" },
];

interface Question {
  id: string;
  type: string;
  questionText: string;
  options: unknown;
  correctAnswer: string | null;
  marks: number;
  topic: string | null;
  order: number;
}

export function QuestionsTab({ testId, questions, canManage }: { testId: string; questions: Question[]; canManage: boolean }) {
  const [nextOrder, setNextOrder] = React.useState(questions.length);
  const [generatorOpen, setGeneratorOpen] = React.useState(false);
  const [drafts, setDrafts] = React.useState<DraftQuestion[]>([]);

  const fields: FieldDef[] = [
    { type: "select", name: "type", label: "Question Type", required: true, options: TYPE_OPTIONS },
    { type: "textarea", name: "questionText", label: "Question", required: true },
    { type: "textarea", name: "optionsText", label: "Options (MCQ only — one per line)", placeholder: "Option A\nOption B\nOption C\nOption D" },
    { type: "text", name: "correctAnswer", label: "Correct Answer (MCQ: exact option text; Numerical: exact value)" },
    { type: "number", name: "marks", label: "Marks", required: true },
    { type: "text", name: "topic", label: "Topic (optional — enables per-topic analytics)", placeholder: "e.g. Newton's Third Law" },
  ];

  const totalQuestionMarks = questions.reduce((sum, q) => sum + q.marks, 0);

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex flex-wrap gap-2">
          <EntityDialog
            trigger={
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> Add Question
              </Button>
            }
            title="Add Question"
            fields={fields}
            onSubmit={(data) => {
              setNextOrder((n) => n + 1);
              return addQuestionAction(testId, nextOrder, data);
            }}
          />
          <Button variant="outline" size="sm" onClick={() => setGeneratorOpen((o) => !o)}>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Generate with AI
          </Button>
        </div>
      )}

      {generatorOpen && (
        <QuestionGeneratorPanel
          testId={testId}
          onGenerated={(newDrafts) => {
            setDrafts((prev) => [...prev, ...newDrafts]);
            setGeneratorOpen(false);
          }}
        />
      )}

      {drafts.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">AI-Generated Drafts — review before adding</p>
          {drafts.map((draft, i) => (
            <DraftQuestionCard
              key={i}
              draft={draft}
              onAdd={async (edited) => {
                const order = nextOrder;
                setNextOrder((n) => n + 1);
                await addQuestionAction(testId, order, {
                  type: edited.type,
                  questionText: edited.questionText,
                  optionsText: edited.options.join("\n"),
                  correctAnswer: edited.correctAnswer,
                  marks: edited.marks,
                  topic: edited.topic,
                });
                setDrafts((prev) => prev.filter((_, idx) => idx !== i));
                toast.success("Question added to test");
              }}
              onDiscard={() => setDrafts((prev) => prev.filter((_, idx) => idx !== i))}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {questions.length} question{questions.length === 1 ? "" : "s"} · {totalQuestionMarks} marks total
      </p>

      {questions.length === 0 ? (
        <EmptyState title="No questions added yet" />
      ) : (
        <ol className="space-y-2">
          {questions.map((q, idx) => (
            <li key={q.id} className="rounded-lg border border-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {idx + 1}. {q.questionText}
                  </p>
                  {Array.isArray(q.options) && q.options.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5 pl-4 text-xs text-muted-foreground">
                      {(q.options as string[]).map((o) => (
                        <li key={o} className={o === q.correctAnswer ? "font-medium text-success" : ""}>
                          {o}
                        </li>
                      ))}
                    </ul>
                  )}
                  {q.type !== "MCQ" && q.correctAnswer && <p className="mt-1 text-xs text-muted-foreground">Answer: {q.correctAnswer}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {q.topic && <Badge variant="outline">{q.topic}</Badge>}
                  <Badge variant="outline">{TYPE_OPTIONS.find((t) => t.value === q.type)?.label}</Badge>
                  <Badge variant="secondary">{q.marks} marks</Badge>
                  {canManage && (
                    <>
                      <EditQuestionButton testId={testId} question={q} fields={fields} />
                      <DeleteQuestionButton testId={testId} questionId={q.id} />
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function EditQuestionButton({ testId, question, fields }: { testId: string; question: Question; fields: FieldDef[] }) {
  const defaultValues: Record<string, FieldValue> = {
    type: question.type,
    questionText: question.questionText,
    optionsText: Array.isArray(question.options) ? (question.options as string[]).join("\n") : "",
    correctAnswer: question.correctAnswer ?? "",
    marks: question.marks,
    topic: question.topic ?? "",
  };

  return (
    <EntityDialog
      trigger={
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      }
      title="Edit Question"
      fields={fields}
      defaultValues={defaultValues}
      onSubmit={(data) => updateQuestionAction(testId, question.id, data)}
    />
  );
}

const DIFFICULTY_OPTIONS = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];
const GEN_TYPE_OPTIONS = [{ value: "MIXED", label: "Mixed" }, ...TYPE_OPTIONS];

function QuestionGeneratorPanel({ testId, onGenerated }: { testId: string; onGenerated: (drafts: DraftQuestion[]) => void }) {
  const [difficulty, setDifficulty] = React.useState("medium");
  const [type, setType] = React.useState("MIXED");
  const [count, setCount] = React.useState("5");
  const [pending, setPending] = React.useState(false);

  async function handleGenerate() {
    setPending(true);
    try {
      const result = await generateQuestionDraftsAction(testId, {
        difficulty: difficulty as "easy" | "medium" | "hard",
        type: type as "MCQ" | "SHORT_ANSWER" | "LONG_ANSWER" | "NUMERICAL" | "MIXED",
        count: Number(count) || 1,
      });
      if (result.length === 0) {
        toast.error("The AI didn't return any parseable questions. Try again.");
      } else {
        onGenerated(result);
      }
    } catch {
      toast.error("Couldn't generate questions.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap items-end gap-3 p-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Difficulty</Label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GEN_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Count (max 15)</Label>
          <Input type="number" min={1} max={15} value={count} onChange={(e) => setCount(e.target.value)} className="w-20" />
        </div>
        <Button size="sm" onClick={handleGenerate} disabled={pending}>
          {pending ? "Generating…" : "Generate"}
        </Button>
      </CardContent>
    </Card>
  );
}

function DraftQuestionCard({ draft, onAdd, onDiscard }: { draft: DraftQuestion; onAdd: (edited: DraftQuestion) => Promise<void>; onDiscard: () => void }) {
  const [type, setType] = React.useState(draft.type);
  const [questionText, setQuestionText] = React.useState(draft.questionText);
  const [optionsText, setOptionsText] = React.useState(draft.options.join("\n"));
  const [correctAnswer, setCorrectAnswer] = React.useState(draft.correctAnswer);
  const [marks, setMarks] = React.useState(String(draft.marks));
  const [topic, setTopic] = React.useState(draft.topic);
  const [pending, setPending] = React.useState(false);

  async function handleAdd() {
    setPending(true);
    try {
      await onAdd({
        type,
        questionText,
        options: optionsText.split("\n").map((o) => o.trim()).filter(Boolean),
        correctAnswer,
        marks: Number(marks) || 1,
        topic,
      });
    } catch {
      toast.error("Could not add this question.");
      setPending(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3">
      <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
        <Select value={type} onValueChange={(v) => setType(v as DraftQuestion["type"])}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} className="min-h-[50px]" />
      </div>
      {type === "MCQ" && (
        <div className="space-y-1">
          <Label className="text-xs">Options (one per line)</Label>
          <Textarea value={optionsText} onChange={(e) => setOptionsText(e.target.value)} className="min-h-[70px]" />
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-[1fr_100px]">
        <div className="space-y-1">
          <Label className="text-xs">Correct Answer</Label>
          <Input value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Marks</Label>
          <Input type="number" value={marks} onChange={(e) => setMarks(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Topic (optional)</Label>
        <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleAdd} disabled={pending}>
          <Check className="mr-1.5 h-3.5 w-3.5" /> {pending ? "Adding…" : "Add to Test"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDiscard} disabled={pending}>
          <X className="mr-1.5 h-3.5 w-3.5" /> Discard
        </Button>
      </div>
    </div>
  );
}

function DeleteQuestionButton({ testId, questionId }: { testId: string; questionId: string }) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await deleteQuestionAction(testId, questionId);
      toast.success("Question removed");
      setOpen(false);
    } catch {
      toast.error("Could not remove question.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(true)}>
        <X className="h-3.5 w-3.5" />
      </Button>
      <ConfirmDialog open={open} onOpenChange={setOpen} title="Remove this question?" destructive loading={pending} onConfirm={handleConfirm} />
    </>
  );
}
