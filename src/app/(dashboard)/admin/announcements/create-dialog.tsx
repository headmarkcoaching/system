"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityDialog, type FieldDef } from "@/components/shared/entity-dialog";
import { createAnnouncementAction } from "./actions";

export function CreateAnnouncementDialog({ levels, batches }: { levels: { id: string; name: string }[]; batches: { id: string; name: string }[] }) {
  const fields: FieldDef[] = [
    { type: "text", name: "title", label: "Title", required: true },
    { type: "textarea", name: "message", label: "Message", required: true },
    {
      type: "select",
      name: "audience",
      label: "Audience",
      required: true,
      options: [
        { value: "ALL_STUDENTS", label: "All Students" },
        { value: "ACADEMIC_LEVEL", label: "Specific Academic Level" },
        { value: "BATCH", label: "Specific Batch" },
        { value: "PARENTS", label: "Parents" },
        { value: "TEACHERS", label: "Teachers" },
      ],
    },
    { type: "select", name: "academicLevelId", label: "Academic Level (if targeting a level)", options: levels.map((l) => ({ value: l.id, label: l.name })) },
    { type: "select", name: "batchId", label: "Batch (if targeting a batch)", options: batches.map((b) => ({ value: b.id, label: b.name })) },
  ];

  return (
    <EntityDialog
      trigger={
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> New Announcement
        </Button>
      }
      title="New Announcement"
      description="Notifications are sent automatically to everyone in the selected audience."
      fields={fields}
      onSubmit={createAnnouncementAction}
    />
  );
}
