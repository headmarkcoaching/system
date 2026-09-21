"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, X, Check, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntityDialog, type FieldDef } from "@/components/shared/entity-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { createKnowledgeDocumentAction, reviewKnowledgeDocumentAction, deleteKnowledgeDocumentAction } from "../actions";

const DOC_TYPE_OPTIONS = [
  { value: "PDF", label: "PDF" },
  { value: "NOTES", label: "Notes" },
  { value: "TEXT", label: "Text" },
  { value: "STUDY_GUIDE", label: "Study Guide" },
  { value: "PAST_PAPER", label: "Past Paper" },
  { value: "TEACHER_CONTENT", label: "Teacher Content" },
];

interface KnowledgeDocItem {
  id: string;
  title: string;
  docType: string;
  chapter: string | null;
  topic: string | null;
  sourceUrl: string | null;
  status: string;
  subject: { name: string } | null;
  uploadedBy: { name: string };
}

export function BatchKnowledgeList({
  batchId,
  academicLevelId,
  boardId,
  groupId,
  documents,
  subjects,
  canUpload,
  canReview,
}: {
  batchId: string;
  academicLevelId: string;
  boardId?: string | null;
  groupId?: string | null;
  documents: KnowledgeDocItem[];
  subjects: { id: string; name: string }[];
  canUpload: boolean;
  canReview: boolean;
}) {
  const fields: FieldDef[] = [
    { type: "text", name: "title", label: "Title", required: true },
    { type: "select", name: "docType", label: "Document Type", required: true, options: DOC_TYPE_OPTIONS },
    { type: "select", name: "subjectId", label: "Subject (optional = every subject in this class)", options: subjects.map((s) => ({ value: s.id, label: s.name })) },
    { type: "text", name: "chapter", label: "Chapter" },
    { type: "text", name: "topic", label: "Topic" },
    { type: "text", name: "sourceUrl", label: "Source Link (optional)", placeholder: "https://…" },
    { type: "textarea", name: "content", label: "Content — paste the actual text here", required: true, placeholder: "This is the only part the AI Study Assistant can actually read. A source link alone is not enough — paste the real text content." },
  ];

  return (
    <div className="space-y-4">
      {canUpload && (
        <div className="flex justify-end">
          <EntityDialog
            trigger={
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> Add Note
              </Button>
            }
            title="Add Note for This Class"
            fields={fields}
            defaultValues={{ academicLevelId, boardId: boardId ?? undefined, groupId: groupId ?? undefined }}
            onSubmit={(data) => createKnowledgeDocumentAction(data, batchId)}
          />
        </div>
      )}

      {documents.length === 0 ? (
        <EmptyState title="No notes for this class yet" description={canUpload ? "Add the first one above." : undefined} />
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li key={doc.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{doc.title}</p>
                  {doc.subject && <Badge variant="outline">{doc.subject.name}</Badge>}
                  <StatusBadge status={doc.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {DOC_TYPE_OPTIONS.find((o) => o.value === doc.docType)?.label}
                  {doc.chapter && ` · ${doc.chapter}`} · Uploaded by {doc.uploadedBy.name}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {canReview && doc.status === "PENDING_REVIEW" && <ReviewButtons id={doc.id} batchId={batchId} />}
                {canUpload && <DeleteButton id={doc.id} batchId={batchId} />}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReviewButtons({ id, batchId }: { id: string; batchId: string }) {
  const [pending, setPending] = React.useState(false);

  async function handleReview(status: "APPROVED" | "REJECTED") {
    setPending(true);
    try {
      await reviewKnowledgeDocumentAction(id, status, batchId);
      toast.success(status === "APPROVED" ? "Approved — visible to the AI Study Assistant now" : "Rejected");
    } catch {
      toast.error("Could not update review status.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-success" disabled={pending} onClick={() => handleReview("APPROVED")}>
        <Check className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" disabled={pending} onClick={() => handleReview("REJECTED")}>
        <Ban className="h-3.5 w-3.5" />
      </Button>
    </>
  );
}

function DeleteButton({ id, batchId }: { id: string; batchId: string }) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await deleteKnowledgeDocumentAction(id, batchId);
      toast.success("Removed");
      setOpen(false);
    } catch {
      toast.error("Could not remove document.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(true)}>
        <X className="h-3.5 w-3.5" />
      </Button>
      <ConfirmDialog open={open} onOpenChange={setOpen} title="Remove this note?" destructive loading={pending} onConfirm={handleConfirm} />
    </>
  );
}
