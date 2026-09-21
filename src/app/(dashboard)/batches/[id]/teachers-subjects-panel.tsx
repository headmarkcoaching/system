"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { assignTeacherAction, removeTeacherAction, addSubjectAction, removeSubjectAction } from "@/app/(dashboard)/admin/batches/actions";

export function TeachersSubjectsPanel({
  batchId,
  teachers,
  subjects,
  allTeachers,
  allSubjects,
  canManage,
}: {
  batchId: string;
  teachers: { id: string; teacherId: string; teacher: { fullName: string }; subject: { name: string } | null }[];
  subjects: { id: string; subjectId: string; subject: { name: string } }[];
  allTeachers: { id: string; fullName: string }[];
  allSubjects: { id: string; name: string }[];
  canManage: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Teachers</h3>
          {canManage && <AssignTeacherDialog batchId={batchId} allTeachers={allTeachers} allSubjects={allSubjects} />}
        </div>
        {teachers.length === 0 ? (
          <EmptyState title="No teachers assigned" className="py-6" />
        ) : (
          <ul className="space-y-1.5">
            {teachers.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm">
                <span>
                  {t.teacher.fullName} {t.subject && <span className="text-muted-foreground">· {t.subject.name}</span>}
                </span>
                {canManage && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeTeacherAction(batchId, t.id).then(() => toast.success("Removed"))}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Subjects</h3>
          {canManage && <AddSubjectDialog batchId={batchId} allSubjects={allSubjects} existing={subjects.map((s) => s.subjectId)} />}
        </div>
        {subjects.length === 0 ? (
          <EmptyState title="No subjects added" className="py-6" />
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {subjects.map((s) => (
              <Badge key={s.id} variant="secondary" className="gap-1">
                {s.subject.name}
                {canManage && (
                  <button onClick={() => removeSubjectAction(batchId, s.id).then(() => toast.success("Removed"))} aria-label="Remove subject">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AssignTeacherDialog({ batchId, allTeachers, allSubjects }: { batchId: string; allTeachers: { id: string; fullName: string }[]; allSubjects: { id: string; name: string }[] }) {
  const [open, setOpen] = React.useState(false);
  const [teacherId, setTeacherId] = React.useState("");
  const [subjectId, setSubjectId] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function handleSubmit() {
    if (!teacherId) {
      toast.error("Select a teacher.");
      return;
    }
    setPending(true);
    try {
      await assignTeacherAction(batchId, teacherId, subjectId || undefined);
      toast.success("Teacher assigned");
      setOpen(false);
      setTeacherId("");
      setSubjectId("");
    } catch {
      toast.error("Could not assign teacher.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Teacher</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={teacherId} onValueChange={setTeacherId}>
            <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
            <SelectContent>
              {allTeachers.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger><SelectValue placeholder="Subject (optional)" /></SelectTrigger>
            <SelectContent>
              {allSubjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? "Assigning…" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddSubjectDialog({ batchId, allSubjects, existing }: { batchId: string; allSubjects: { id: string; name: string }[]; existing: string[] }) {
  const [open, setOpen] = React.useState(false);
  const [subjectId, setSubjectId] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const available = allSubjects.filter((s) => !existing.includes(s.id));

  async function handleSubmit() {
    if (!subjectId) {
      toast.error("Select a subject.");
      return;
    }
    setPending(true);
    try {
      await addSubjectAction(batchId, subjectId);
      toast.success("Subject added");
      setOpen(false);
      setSubjectId("");
    } catch {
      toast.error("Could not add subject.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Subject</DialogTitle>
        </DialogHeader>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
          <SelectContent>
            {available.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? "Adding…" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
