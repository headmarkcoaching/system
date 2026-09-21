"use client";

import { Plus, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityDialog, type FieldDef } from "@/components/shared/entity-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { createRecordingAction } from "@/app/(dashboard)/admin/batches/actions";

export function RecordingsTab({
  batchId,
  recordings,
  subjects,
  liveClasses,
  canManage,
}: {
  batchId: string;
  recordings: { id: string; title: string; recordingDate: Date; recordingUrl: string; subject: { name: string } }[];
  subjects: { id: string; name: string }[];
  liveClasses: { id: string; title: string; scheduledDate: Date; subject: { name: string } }[];
  canManage: boolean;
}) {
  const fields: FieldDef[] = [
    { type: "text", name: "title", label: "Title", required: true },
    { type: "select", name: "subjectId", label: "Subject", required: true, options: subjects.map((s) => ({ value: s.id, label: s.name })) },
    { type: "text", name: "chapter", label: "Chapter" },
    { type: "text", name: "recordingDate", label: "Recording Date (YYYY-MM-DD)", required: true },
    { type: "text", name: "recordingUrl", label: "Recording URL", required: true, placeholder: "https://…" },
    {
      type: "select",
      name: "liveClassId",
      label: "Which live class session is this?",
      required: true,
      options: liveClasses
        .slice()
        .sort((a, b) => b.scheduledDate.getTime() - a.scheduledDate.getTime())
        .map((c) => ({ value: c.id, label: `${c.subject.name} — ${c.title} — ${formatDate(c.scheduledDate)}` })),
    },
  ];

  return (
    <div className="space-y-4">
      {canManage && (
        <EntityDialog
          trigger={
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Upload Recording
            </Button>
          }
          title="Upload Recording"
          description="Before pasting the link: in Google Drive's share settings, turn on “Viewers and commenters can't download, print, or copy.” That's what actually stops students from saving the video — the academy portal only controls when they're allowed to watch it, not the file itself."
          fields={fields}
          onSubmit={(data) => createRecordingAction(batchId, data)}
        />
      )}

      {recordings.length === 0 ? (
        <EmptyState title="No recordings yet" />
      ) : (
        <ul className="space-y-2">
          {recordings.map((r) => (
            <li key={r.id} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="font-medium">{r.title}</p>
                <p className="text-xs text-muted-foreground">
                  {r.subject.name} · {formatDate(r.recordingDate)}
                </p>
              </div>
              <a href={r.recordingUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <PlayCircle className="mr-1.5 h-3.5 w-3.5" /> Watch
                </Button>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
