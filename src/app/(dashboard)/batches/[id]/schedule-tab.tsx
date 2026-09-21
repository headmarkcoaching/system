"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityDialog, type FieldDef } from "@/components/shared/entity-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { formatTime } from "@/lib/utils";
import { createTimetableEntryAction, deleteTimetableEntryAction } from "@/app/(dashboard)/admin/batches/actions";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

export function ScheduleTab({
  batchId,
  entries,
  subjects,
  teachers,
  canManage,
}: {
  batchId: string;
  entries: { id: string; dayOfWeek: string; startTime: string; endTime: string; subject: { name: string }; teacher: { fullName: string } }[];
  subjects: { id: string; name: string }[];
  teachers: { id: string; fullName: string }[];
  canManage: boolean;
}) {
  const fields: FieldDef[] = [
    { type: "select", name: "subjectId", label: "Subject", required: true, options: subjects.map((s) => ({ value: s.id, label: s.name })) },
    { type: "select", name: "teacherId", label: "Teacher", required: true, options: teachers.map((t) => ({ value: t.id, label: t.fullName })) },
    { type: "select", name: "dayOfWeek", label: "Day", required: true, options: DAYS.map((d) => ({ value: d, label: d.charAt(0) + d.slice(1).toLowerCase() })) },
    { type: "text", name: "startTime", label: "Start Time (HH:mm)", required: true, placeholder: "16:00" },
    { type: "text", name: "endTime", label: "End Time (HH:mm)", required: true, placeholder: "17:00" },
  ];

  const grouped = DAYS.map((day) => ({ day, items: entries.filter((e) => e.dayOfWeek === day) })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {canManage && (
        <EntityDialog
          trigger={
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Add Timetable Entry
            </Button>
          }
          title="Add Timetable Entry"
          fields={fields}
          onSubmit={(data) => createTimetableEntryAction(batchId, data)}
        />
      )}

      {grouped.length === 0 ? (
        <EmptyState title="No timetable entries yet" />
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => (
            <div key={g.day}>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.day}</p>
              <ul className="space-y-1.5">
                {g.items.map((e) => (
                  <li key={e.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <span>
                      {formatTime(e.startTime)} – {formatTime(e.endTime)} · {e.subject.name} · {e.teacher.fullName}
                    </span>
                    {canManage && <DeleteButton batchId={batchId} id={e.id} />}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeleteButton({ batchId, id }: { batchId: string; id: string }) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await deleteTimetableEntryAction(batchId, id);
      toast.success("Removed");
      setOpen(false);
    } catch {
      toast.error("Could not remove entry.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(true)}>
        <X className="h-3.5 w-3.5" />
      </Button>
      <ConfirmDialog open={open} onOpenChange={setOpen} title="Remove this timetable entry?" destructive loading={pending} onConfirm={handleConfirm} />
    </>
  );
}
