"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { addStudentNoteAction } from "@/app/(dashboard)/admin/students/actions";

export function NotesTab({
  studentId,
  notes,
  canAdd,
}: {
  studentId: string;
  notes: { id: string; note: string; createdAt: Date; author: { name: string } }[];
  canAdd: boolean;
}) {
  async function action(formData: FormData) {
    const note = String(formData.get("note") ?? "");
    const result = await addStudentNoteAction(studentId, note);
    if (result?.error) toast.error(result.error);
  }

  return (
    <div className="space-y-4">
      {canAdd && (
        <form action={action} className="flex flex-col gap-2 sm:flex-row">
          <Textarea name="note" placeholder="Add an internal note (visible to staff only)…" required className="sm:flex-1" />
          <SubmitButton />
        </form>
      )}

      {notes.length === 0 ? (
        <EmptyState title="No internal notes yet" />
      ) : (
        <ul className="space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-border bg-card p-3">
              <p className="text-sm">{n.note}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {n.author.name} · {formatDate(n.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="shrink-0">
      {pending ? "Adding…" : "Add Note"}
    </Button>
  );
}
