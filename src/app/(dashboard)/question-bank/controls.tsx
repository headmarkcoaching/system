"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, FileUp, Pencil, Plus, Sparkles, Trash2, Upload, Archive, RotateCcw, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityDialog, type FieldDef, type FieldValue } from "@/components/shared/entity-dialog";
import {
  createChapterAction,
  updateChapterAction,
  deleteChapterAction,
  createQuestionAction,
  updateQuestionAction,
  setQuestionStatusAction,
  deleteQuestionAction,
  importQuestionsAction,
  aiDraftQuestionsAction,
  createPastPaperAction,
  updatePastPaperAction,
  setPastPaperPublishedAction,
  deletePastPaperAction,
  uploadPastPaperFileAction,
} from "./actions";

export interface Option {
  value: string;
  label: string;
}

const TYPE_OPTIONS: Option[] = [
  { value: "MCQ", label: "Multiple choice" },
  { value: "NUMERICAL", label: "Numerical answer" },
  { value: "SHORT_ANSWER", label: "Short answer (written)" },
  { value: "LONG_ANSWER", label: "Long answer (written)" },
];
const DIFFICULTY_OPTIONS: Option[] = [
  { value: "EASY", label: "Easy" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HARD", label: "Hard" },
];
const SESSION_OPTIONS: Option[] = [
  { value: "ANNUAL", label: "Annual" },
  { value: "SUPPLEMENTARY", label: "Supplementary" },
  { value: "MODEL", label: "Model paper" },
];

// ---- Chapters ----

function chapterFields(subjects: Option[], levels: Option[], boards: Option[], editing: boolean): FieldDef[] {
  return [
    ...(editing
      ? []
      : ([
          { type: "select", name: "subjectId", label: "Subject", required: true, options: subjects },
          { type: "select", name: "academicLevelId", label: "Class", required: true, options: levels },
        ] as FieldDef[])),
    { type: "select", name: "boardId", label: "Board", options: [{ value: "", label: "All boards" }, ...boards] },
    { type: "number", name: "number", label: "Chapter number", required: true },
    { type: "text", name: "title", label: "Chapter title", required: true, placeholder: "For example: Logarithms" },
  ];
}

export function AddChapterButton({ subjects, levels, boards }: { subjects: Option[]; levels: Option[]; boards: Option[] }) {
  const router = useRouter();
  return (
    <EntityDialog
      trigger={
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Add chapter
        </Button>
      }
      title="Add chapter"
      description="Chapters are what quarter, half and full-book papers are built from, so number them in book order."
      fields={chapterFields(subjects, levels, boards, false)}
      onSubmit={createChapterAction}
      onSuccess={() => router.refresh()}
    />
  );
}

export function EditChapterButton({
  chapter,
  subjectId,
  academicLevelId,
  boards,
}: {
  chapter: { id: string; number: number; title: string; boardId: string | null };
  subjectId: string;
  academicLevelId: string;
  boards: Option[];
}) {
  const router = useRouter();
  return (
    <EntityDialog
      trigger={
        <Button size="sm" variant="ghost" aria-label={`Edit chapter ${chapter.number}`}>
          <Pencil className="h-4 w-4" />
        </Button>
      }
      title={`Edit chapter ${chapter.number}`}
      fields={chapterFields([], [], boards, true)}
      defaultValues={{ boardId: chapter.boardId ?? "", number: chapter.number, title: chapter.title }}
      onSubmit={(data) => updateChapterAction(chapter.id, { ...data, subjectId, academicLevelId })}
      onSuccess={() => router.refresh()}
    />
  );
}

export function DeleteChapterButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  async function remove() {
    setPending(true);
    const result = await deleteChapterAction(id);
    setPending(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Chapter deleted");
      router.refresh();
    }
    setConfirming(false);
  }
  if (!confirming)
    return (
      <Button size="sm" variant="ghost" onClick={() => setConfirming(true)} aria-label={`Delete ${label}`}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    );
  return (
    <span className="inline-flex items-center gap-1">
      <Button size="sm" variant="destructive" onClick={remove} disabled={pending}>
        {pending ? "Deleting…" : "Delete?"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
        No
      </Button>
    </span>
  );
}

// ---- Questions ----

export interface QuestionFormData {
  id?: string;
  chapterId: string;
  type: string;
  questionText: string;
  options: string[] | null;
  correctAnswer: string | null;
  explanation: string | null;
  marks: number;
  difficulty: string;
  topic: string | null;
  status: string;
  pastPaperId: string | null;
  paperOrder: number;
}

function questionFields(chapters: Option[], papers: Option[]): FieldDef[] {
  return [
    { type: "select", name: "chapterId", label: "Chapter", required: true, options: chapters },
    { type: "select", name: "type", label: "Question type", required: true, options: TYPE_OPTIONS },
    { type: "textarea", name: "questionText", label: "Question", required: true },
    { type: "textarea", name: "optionsText", label: "Options for multiple choice (one per line)", placeholder: "Option one\nOption two\nOption three\nOption four" },
    { type: "text", name: "correctAnswer", label: "Correct answer (must match an option exactly for multiple choice; the model answer for written)" },
    { type: "textarea", name: "explanation", label: "Explanation shown after the answer (worked solution)" },
    { type: "number", name: "marks", label: "Marks", required: true },
    { type: "select", name: "difficulty", label: "Difficulty", required: true, options: DIFFICULTY_OPTIONS },
    { type: "text", name: "topic", label: "Topic (optional)", placeholder: "For example: Laws of logarithms" },
    { type: "select", name: "pastPaperId", label: "Past paper (optional)", options: [{ value: "", label: "Not from a past paper" }, ...papers] },
    { type: "number", name: "paperOrder", label: "Position in that paper (1, 2, 3...)" },
    {
      type: "select",
      name: "status",
      label: "Status",
      required: true,
      options: [
        { value: "APPROVED", label: "Approved: students can see it" },
        { value: "DRAFT", label: "Draft: hidden until approved" },
      ],
    },
  ];
}

export function AddQuestionButton({ chapters, papers, defaultChapterId }: { chapters: Option[]; papers: Option[]; defaultChapterId?: string }) {
  const router = useRouter();
  return (
    <EntityDialog
      trigger={
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Add question
        </Button>
      }
      title="Add question"
      fields={questionFields(chapters, papers)}
      defaultValues={{ chapterId: defaultChapterId ?? "", type: "MCQ", marks: 1, difficulty: "MEDIUM", status: "APPROVED", paperOrder: 0, pastPaperId: "" }}
      onSubmit={createQuestionAction}
      onSuccess={() => router.refresh()}
    />
  );
}

export function EditQuestionButton({ question, chapters, papers }: { question: QuestionFormData; chapters: Option[]; papers: Option[] }) {
  const router = useRouter();
  const values: Record<string, FieldValue> = {
    chapterId: question.chapterId,
    type: question.type,
    questionText: question.questionText,
    optionsText: (question.options ?? []).join("\n"),
    correctAnswer: question.correctAnswer ?? "",
    explanation: question.explanation ?? "",
    marks: question.marks,
    difficulty: question.difficulty,
    topic: question.topic ?? "",
    status: question.status === "ARCHIVED" ? "DRAFT" : question.status,
    pastPaperId: question.pastPaperId ?? "",
    paperOrder: question.paperOrder,
  };
  return (
    <EntityDialog
      trigger={
        <Button size="sm" variant="ghost" aria-label="Edit question">
          <Pencil className="h-4 w-4" />
        </Button>
      }
      title="Edit question"
      description="Changing an approved question changes it for every student who sees it from now on."
      fields={questionFields(chapters, papers)}
      defaultValues={values}
      onSubmit={(data) => updateQuestionAction(question.id as string, data)}
      onSuccess={() => router.refresh()}
    />
  );
}

export function QuestionStatusButtons({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function run(fn: () => Promise<{ error?: string }>, done: string) {
    setPending(true);
    const result = await fn();
    setPending(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success(done);
      router.refresh();
    }
  }

  return (
    <span className="inline-flex items-center gap-0.5">
      {status === "DRAFT" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setQuestionStatusAction(id, "APPROVED"), "Approved")} aria-label="Approve question" title="Approve">
          <Check className="h-4 w-4 text-success" />
        </Button>
      )}
      {status === "APPROVED" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setQuestionStatusAction(id, "ARCHIVED"), "Archived")} aria-label="Archive question" title="Archive">
          <Archive className="h-4 w-4" />
        </Button>
      )}
      {status === "ARCHIVED" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setQuestionStatusAction(id, "DRAFT"), "Restored as a draft")} aria-label="Restore question" title="Restore as draft">
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}
      {status === "DRAFT" && (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => deleteQuestionAction(id), "Deleted")} aria-label="Delete draft" title="Delete draft">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </span>
  );
}

const IMPORT_HELP =
  "Separate questions with a line holding only ---. Each question uses labelled lines: Q, TYPE, OPTIONS (separated by |), ANSWER, EXPLANATION, MARKS and DIFFICULTY. See the example in the box. Add a CHAPTER line with a chapter number to override the default chapter. Imported questions arrive as drafts for you to review.";

export function ImportQuestionsButton({ chapters, papers }: { chapters: Option[]; papers: Option[] }) {
  const router = useRouter();
  return (
    <EntityDialog
      trigger={
        <Button size="sm" variant="outline">
          <FileUp className="mr-1.5 h-4 w-4" /> Paste questions
        </Button>
      }
      title="Paste questions"
      description={IMPORT_HELP}
      fields={[
        { type: "select", name: "chapterId", label: "Default chapter", required: true, options: chapters },
        { type: "select", name: "pastPaperId", label: "Past paper (optional)", options: [{ value: "", label: "Not part of a paper" }, ...papers] },
        {
          type: "textarea",
          name: "text",
          label: "Questions",
          required: true,
          placeholder: "Q: Find log₃ 81.\nTYPE: NUMERICAL\nANSWER: 4\nEXPLANATION: 3⁴ = 81.\nMARKS: 1\nDIFFICULTY: EASY\n---\nQ: Which is a prime number?\nTYPE: MCQ\nOPTIONS: 4 | 6 | 7 | 9\nANSWER: 7\nMARKS: 1",
        },
      ]}
      defaultValues={{ pastPaperId: "" }}
      submitLabel="Import as drafts"
      onSubmit={importQuestionsAction}
      onSuccess={() => router.refresh()}
    />
  );
}

export function AiDraftButton({ chapters }: { chapters: Option[] }) {
  const router = useRouter();
  return (
    <EntityDialog
      trigger={
        <Button size="sm" variant="outline">
          <Sparkles className="mr-1.5 h-4 w-4" /> AI drafts
        </Button>
      }
      title="Draft questions with AI"
      description="The AI writes questions for a chapter. They arrive as drafts, and nothing reaches students until you check the answers and approve them."
      fields={[
        { type: "select", name: "chapterId", label: "Chapter", required: true, options: chapters },
        { type: "select", name: "type", label: "Question type", required: true, options: [{ value: "MIXED", label: "A mix" }, ...TYPE_OPTIONS] },
        {
          type: "select",
          name: "difficulty",
          label: "Difficulty",
          required: true,
          options: [
            { value: "easy", label: "Easy" },
            { value: "medium", label: "Medium" },
            { value: "hard", label: "Hard" },
          ],
        },
        { type: "number", name: "count", label: "How many (up to 15)", required: true },
      ]}
      defaultValues={{ type: "MIXED", difficulty: "medium", count: 5 }}
      submitLabel="Generate drafts"
      onSubmit={aiDraftQuestionsAction}
      onSuccess={() => router.refresh()}
    />
  );
}

// ---- Past papers ----

function paperFields(subjects: Option[], levels: Option[], boards: Option[], editing: boolean): FieldDef[] {
  return [
    ...(editing
      ? []
      : ([
          { type: "select", name: "subjectId", label: "Subject", required: true, options: subjects },
          { type: "select", name: "academicLevelId", label: "Class", required: true, options: levels },
        ] as FieldDef[])),
    { type: "select", name: "boardId", label: "Board", options: [{ value: "", label: "All boards" }, ...boards] },
    { type: "number", name: "year", label: "Year", required: true },
    { type: "select", name: "session", label: "Session", required: true, options: SESSION_OPTIONS },
    { type: "text", name: "title", label: "Title", required: true, placeholder: "For example: Annual 2023, Paper I" },
    { type: "number", name: "totalMarks", label: "Total marks", required: true },
    { type: "number", name: "durationMinutes", label: "Time allowed (minutes)", required: true },
  ];
}

export function AddPaperButton({ subjects, levels, boards }: { subjects: Option[]; levels: Option[]; boards: Option[] }) {
  const router = useRouter();
  return (
    <EntityDialog
      trigger={
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Add past paper
        </Button>
      }
      title="Add past paper"
      description="Create the paper first, then paste or add its questions and attach the paper's PDF. Publish it when it's ready for students."
      fields={paperFields(subjects, levels, boards, false)}
      defaultValues={{ session: "ANNUAL", year: new Date().getFullYear() - 1, boardId: "" }}
      onSubmit={createPastPaperAction}
      onSuccess={() => router.refresh()}
    />
  );
}

export function EditPaperButton({
  paper,
  subjectId,
  academicLevelId,
  boards,
}: {
  paper: { id: string; boardId: string | null; year: number; session: string; title: string; totalMarks: number; durationMinutes: number };
  subjectId: string;
  academicLevelId: string;
  boards: Option[];
}) {
  const router = useRouter();
  return (
    <EntityDialog
      trigger={
        <Button size="sm" variant="ghost" aria-label="Edit paper">
          <Pencil className="h-4 w-4" />
        </Button>
      }
      title="Edit past paper"
      fields={paperFields([], [], boards, true)}
      defaultValues={{ boardId: paper.boardId ?? "", year: paper.year, session: paper.session, title: paper.title, totalMarks: paper.totalMarks, durationMinutes: paper.durationMinutes }}
      onSubmit={(data) => updatePastPaperAction(paper.id, { ...data, subjectId, academicLevelId })}
      onSuccess={() => router.refresh()}
    />
  );
}

export function PaperRowActions({ id, published, hasFile }: { id: string; published: boolean; hasFile: boolean }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function run(fn: () => Promise<{ error?: string }>, done: string) {
    setPending(true);
    const result = await fn();
    setPending(false);
    if (result.error) toast.error(result.error);
    else {
      toast.success(done);
      router.refresh();
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("file", file);
    await run(() => uploadPastPaperFileAction(id, fd), "Paper file uploaded");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="sr-only" onChange={onFile} aria-label="Upload paper file" />
      <Button size="sm" variant="outline" disabled={pending} onClick={() => fileRef.current?.click()}>
        <Upload className="mr-1.5 h-3.5 w-3.5" /> {hasFile ? "Replace file" : "Attach file"}
      </Button>
      <Button size="sm" variant={published ? "outline" : "default"} disabled={pending} onClick={() => run(() => setPastPaperPublishedAction(id, !published), published ? "Unpublished" : "Published")}>
        {published ? <EyeOff className="mr-1.5 h-3.5 w-3.5" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}
        {published ? "Unpublish" : "Publish"}
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => deletePastPaperAction(id), "Paper deleted")} aria-label="Delete paper">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </span>
  );
}
