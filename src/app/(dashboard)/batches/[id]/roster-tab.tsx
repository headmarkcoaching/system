"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { EntityDialog, type FieldDef } from "@/components/shared/entity-dialog";
import { addStudentToBatchAction, removeStudentFromBatchAction } from "@/app/(dashboard)/admin/batches/actions";
import { recordParticipationAction } from "@/app/(dashboard)/students/[id]/performance-actions";

export function RosterTab({
  batchId,
  students,
  pickerStudents,
  canManage,
}: {
  batchId: string;
  students: { id: string; studentId: string; student: { id: string; fullName: string; studentCode: string } }[];
  pickerStudents: { id: string; fullName: string; studentCode: string }[];
  canManage: boolean;
}) {
  const enrolledIds = new Set(students.map((s) => s.studentId));
  const available = pickerStudents.filter((s) => !enrolledIds.has(s.id));

  return (
    <div className="space-y-4">
      {canManage && <AddStudentDialog batchId={batchId} available={available} />}

      {students.length === 0 ? (
        <EmptyState title="No students enrolled yet" />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {students.map((row) => (
            <li key={row.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <Link href={`/students/${row.studentId}`} className="min-w-0">
                <p className="truncate font-medium hover:underline">{row.student.fullName}</p>
                <p className="text-xs text-muted-foreground">{row.student.studentCode}</p>
              </Link>
              {canManage && (
                <div className="flex items-center gap-1">
                  <ParticipationDialog batchId={batchId} studentId={row.studentId} name={row.student.fullName} />
                  <RemoveButton batchId={batchId} studentId={row.studentId} name={row.student.fullName} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ParticipationDialog({ batchId, studentId, name }: { batchId: string; studentId: string; name: string }) {
  const fields: FieldDef[] = [
    { type: "number", name: "score", label: "Participation Score (0-100)", required: true },
    { type: "textarea", name: "note", label: "Note (optional)" },
  ];

  return (
    <EntityDialog
      trigger={
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" title="Record participation score">
          <Star className="h-3.5 w-3.5" />
        </Button>
      }
      title={`Record Participation — ${name}`}
      description="Covers the last 30 days. Feeds into the student's Academic Performance Score."
      fields={fields}
      onSubmit={(data) => recordParticipationAction(studentId, batchId, data)}
      submitLabel="Save Score"
    />
  );
}

function AddStudentDialog({ batchId, available }: { batchId: string; available: { id: string; fullName: string; studentCode: string }[] }) {
  const [open, setOpen] = React.useState(false);
  const [studentId, setStudentId] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function handleAdd() {
    if (!studentId) {
      toast.error("Select a student to add.");
      return;
    }
    setPending(true);
    try {
      await addStudentToBatchAction(batchId, studentId);
      toast.success("Student added to batch");
      setOpen(false);
      setStudentId("");
    } catch {
      toast.error("Could not add student.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Add Student
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Student to Batch</DialogTitle>
        </DialogHeader>
        <Select value={studentId} onValueChange={setStudentId}>
          <SelectTrigger><SelectValue placeholder="Select a student" /></SelectTrigger>
          <SelectContent>
            {available.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.fullName} — {s.studentCode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={pending}>
            {pending ? "Adding…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveButton({ batchId, studentId, name }: { batchId: string; studentId: string; name: string }) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await removeStudentFromBatchAction(batchId, studentId);
      toast.success("Removed from batch");
      setOpen(false);
    } catch {
      toast.error("Could not remove student.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setOpen(true)}>
        <X className="h-3.5 w-3.5" />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Remove student from batch?"
        description={`${name} will be removed from this batch's roster.`}
        destructive
        loading={pending}
        onConfirm={handleConfirm}
      />
    </>
  );
}
