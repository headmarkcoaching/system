"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, ClipboardCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EntityDialog, type FieldDef, type FieldValue } from "@/components/shared/entity-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { createHomeworkAction, gradeHomeworkAction, suggestHomeworkDraftAction } from "@/app/(dashboard)/admin/batches/actions";

interface Submission {
  id: string;
  status: string;
  marksObtained: number | null;
  teacherFeedback: string | null;
  attachmentUrl: string | null;
  attachmentFileId: string | null;
  studentComments: string | null;
  student: { id: string; fullName: string };
}

interface HomeworkItem {
  id: string;
  title: string;
  dueDate: Date;
  maxMarks: number | null;
  subject: { name: string };
  submissions: Submission[];
}

export function HomeworkTab({
  batchId,
  homeworkList,
  subjects,
  canManage,
}: {
  batchId: string;
  homeworkList: HomeworkItem[];
  subjects: { id: string; name: string }[];
  canManage: boolean;
}) {
  const [reviewing, setReviewing] = React.useState<HomeworkItem | null>(null);
  const [aiDraft, setAiDraft] = React.useState<Record<string, FieldValue> | undefined>(undefined);
  const [suggestOpen, setSuggestOpen] = React.useState(false);

  const fields: FieldDef[] = [
    { type: "text", name: "title", label: "Title", required: true },
    { type: "textarea", name: "description", label: "Description", required: true },
    { type: "select", name: "subjectId", label: "Subject", required: true, options: subjects.map((s) => ({ value: s.id, label: s.name })) },
    { type: "text", name: "chapter", label: "Chapter" },
    { type: "text", name: "dueDate", label: "Due Date (YYYY-MM-DD)", required: true },
    { type: "number", name: "maxMarks", label: "Maximum Marks" },
    { type: "text", name: "attachmentUrl", label: "Attachment Link (optional)" },
  ];

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setSuggestOpen(true)}>
            <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Suggest with AI
          </Button>
          <EntityDialog
            trigger={
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> Assign Homework
              </Button>
            }
            title="Assign Homework"
            fields={fields}
            defaultValues={aiDraft}
            onSubmit={(data) => createHomeworkAction(batchId, data)}
            onSuccess={() => setAiDraft(undefined)}
          />
        </div>
      )}

      {suggestOpen && (
        <SuggestWithAIDialog
          batchId={batchId}
          subjects={subjects}
          onClose={() => setSuggestOpen(false)}
          onDraft={(draft) => {
            setAiDraft(draft);
            setSuggestOpen(false);
            toast.success('Draft ready — click "Assign Homework" to review and save it.');
          }}
        />
      )}

      {homeworkList.length === 0 ? (
        <EmptyState title="No homework assigned yet" />
      ) : (
        <ul className="space-y-2">
          {homeworkList.map((hw) => {
            const total = hw.submissions.length;
            const submitted = hw.submissions.filter((s) => s.status !== "PENDING").length;
            const reviewed = hw.submissions.filter((s) => s.status === "REVIEWED").length;
            return (
              <li key={hw.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{hw.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {hw.subject.name} · Due {formatDate(hw.dueDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{total} Total</Badge>
                  <Badge variant="secondary">{submitted} Submitted</Badge>
                  <Badge variant="success">{reviewed} Reviewed</Badge>
                  <Button variant="outline" size="sm" onClick={() => setReviewing(hw)}>
                    <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" /> Review
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {reviewing && (
        <GradeDialog batchId={batchId} homework={reviewing} canManage={canManage} onClose={() => setReviewing(null)} />
      )}
    </div>
  );
}

function SuggestWithAIDialog({
  batchId,
  subjects,
  onClose,
  onDraft,
}: {
  batchId: string;
  subjects: { id: string; name: string }[];
  onClose: () => void;
  onDraft: (draft: Record<string, FieldValue>) => void;
}) {
  const [subjectId, setSubjectId] = React.useState("");
  const [chapter, setChapter] = React.useState("");
  const [focusHint, setFocusHint] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function handleGenerate() {
    if (!subjectId) {
      toast.error("Select a subject first.");
      return;
    }
    setPending(true);
    try {
      const draft = await suggestHomeworkDraftAction(batchId, { subjectId, chapter: chapter || undefined, focusHint: focusHint || undefined });
      onDraft({ title: draft.title, description: draft.description, subjectId, chapter: draft.chapter });
    } catch {
      toast.error("Couldn't generate a suggestion.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suggest Homework with AI</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Subject</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Chapter (optional)</Label>
            <Input value={chapter} onChange={(e) => setChapter(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Focus (optional)</Label>
            <Input value={focusHint} onChange={(e) => setFocusHint(e.target.value)} placeholder="e.g. practice with word problems" />
          </div>
          <Button size="sm" onClick={handleGenerate} disabled={pending}>
            {pending ? "Generating…" : "Generate Draft"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function GradeDialog({ batchId, homework, canManage, onClose }: { batchId: string; homework: HomeworkItem; canManage: boolean; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{homework.title} — Submissions</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-3 overflow-y-auto">
          {homework.submissions.map((sub) => (
            <SubmissionRow key={sub.id} batchId={batchId} submission={sub} maxMarks={homework.maxMarks} canManage={canManage} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SubmissionRow({ batchId, submission, maxMarks, canManage }: { batchId: string; submission: Submission; maxMarks: number | null; canManage: boolean }) {
  const [marks, setMarks] = React.useState(submission.marksObtained?.toString() ?? "");
  const [feedback, setFeedback] = React.useState(submission.teacherFeedback ?? "");
  const [pending, setPending] = React.useState(false);

  async function handleGrade(status: "REVIEWED" | "RESUBMISSION_REQUESTED") {
    setPending(true);
    try {
      await gradeHomeworkAction(batchId, submission.id, {
        marksObtained: marks ? Number(marks) : undefined,
        teacherFeedback: feedback || undefined,
        status,
      });
      toast.success("Submission updated");
    } catch {
      toast.error("Could not update submission.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="font-medium">{submission.student.fullName}</p>
        <StatusBadge status={submission.status} />
      </div>
      {(submission.attachmentUrl || submission.attachmentFileId || submission.studentComments) && (
        <div className="space-y-1 text-xs text-muted-foreground">
          {submission.attachmentUrl && (
            <p>
              <a href={submission.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Attachment link
              </a>
            </p>
          )}
          {submission.attachmentFileId && (
            <p>
              <a href={`/api/files/${submission.attachmentFileId}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Uploaded file
              </a>
            </p>
          )}
          {submission.studentComments && <p>&ldquo;{submission.studentComments}&rdquo;</p>}
        </div>
      )}
      {canManage && submission.status !== "PENDING" && (
        <div className="grid gap-2 sm:grid-cols-[100px_1fr]">
          <div className="space-y-1">
            <Label className="text-xs">Marks {maxMarks ? `/ ${maxMarks}` : ""}</Label>
            <Input value={marks} onChange={(e) => setMarks(e.target.value)} type="number" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Feedback</Label>
            <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} className="min-h-[36px]" />
          </div>
          <div className="col-span-full flex gap-2">
            <Button size="sm" disabled={pending} onClick={() => handleGrade("REVIEWED")}>
              Mark Reviewed
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => handleGrade("RESUBMISSION_REQUESTED")}>
              Request Resubmission
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
