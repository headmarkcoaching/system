"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { EntityDialog, type FieldDef, type FieldValue } from "@/components/shared/entity-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  createAcademicLevelAction,
  updateAcademicLevelAction,
  createBoardAction,
  updateBoardAction,
  createProgramAction,
  updateProgramAction,
  deleteProgramAction,
  createGroupAction,
  updateGroupAction,
  createSubjectAction,
  updateSubjectAction,
} from "./actions";

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return <Badge variant={isActive ? "success" : "outline"}>{isActive ? "Active" : "Inactive"}</Badge>;
}

function EditButton<T extends Record<string, FieldValue>>({
  title,
  fields,
  defaultValues,
  onSubmit,
}: {
  title: string;
  fields: FieldDef[];
  defaultValues: T;
  onSubmit: (data: Record<string, FieldValue>) => Promise<{ error?: string } | void>;
}) {
  return (
    <EntityDialog
      trigger={
        <Button variant="ghost" size="sm">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      }
      title={title}
      fields={fields}
      defaultValues={defaultValues}
      onSubmit={onSubmit}
    />
  );
}

export function AcademicLevelsSection({ levels }: { levels: { id: string; name: string; sortOrder: number; isActive: boolean }[] }) {
  const fields: FieldDef[] = [
    { type: "text", name: "name", label: "Name", required: true, placeholder: "e.g. Class 10" },
    { type: "number", name: "sortOrder", label: "Sort Order" },
    { type: "checkbox", name: "isActive", label: "Active" },
  ];

  const columns: DataTableColumn<(typeof levels)[number]>[] = [
    { key: "name", header: "Academic Level", cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "sortOrder", header: "Order", cell: (r) => r.sortOrder },
    { key: "status", header: "Status", cell: (r) => <ActiveBadge isActive={r.isActive} /> },
    {
      key: "actions",
      header: "",
      cell: (r) => (
        <EditButton
          title="Edit Academic Level"
          fields={fields}
          defaultValues={r}
          onSubmit={(data) => updateAcademicLevelAction(r.id, data)}
        />
      ),
    },
  ];

  return (
    <section className="space-y-3">
      <div className="flex justify-end">
        <EntityDialog
          trigger={
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Add Academic Level
            </Button>
          }
          title="Add Academic Level"
          fields={fields}
          defaultValues={{ isActive: true, sortOrder: levels.length }}
          onSubmit={createAcademicLevelAction}
        />
      </div>
      <DataTable columns={columns} data={levels} rowKey={(r) => r.id} emptyTitle="No academic levels yet" />
    </section>
  );
}

export function BoardsSection({ boards }: { boards: { id: string; name: string; isActive: boolean }[] }) {
  const fields: FieldDef[] = [
    { type: "text", name: "name", label: "Name", required: true, placeholder: "e.g. Punjab Board" },
    { type: "checkbox", name: "isActive", label: "Active" },
  ];

  const columns: DataTableColumn<(typeof boards)[number]>[] = [
    { key: "name", header: "Board", cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "status", header: "Status", cell: (r) => <ActiveBadge isActive={r.isActive} /> },
    {
      key: "actions",
      header: "",
      cell: (r) => <EditButton title="Edit Board" fields={fields} defaultValues={r} onSubmit={(data) => updateBoardAction(r.id, data)} />,
    },
  ];

  return (
    <section className="space-y-3">
      <div className="flex justify-end">
        <EntityDialog
          trigger={
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Add Board
            </Button>
          }
          title="Add Board"
          fields={fields}
          defaultValues={{ isActive: true }}
          onSubmit={createBoardAction}
        />
      </div>
      <DataTable columns={columns} data={boards} rowKey={(r) => r.id} emptyTitle="No boards yet" />
    </section>
  );
}

function DeleteProgramButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      const result = await deleteProgramAction(id);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Program deleted");
      setOpen(false);
    } catch {
      toast.error("Could not delete this program.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <X className="h-3.5 w-3.5" />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete "${name}"?`}
        description="This can't be undone. Programs still assigned to a batch or enrollment can't be deleted — mark it Inactive instead if you just want to stop using it going forward."
        destructive
        loading={pending}
        onConfirm={handleConfirm}
      />
    </>
  );
}

export function ProgramsSection({ programs }: { programs: { id: string; name: string; description: string | null; isActive: boolean }[] }) {
  const fields: FieldDef[] = [
    { type: "text", name: "name", label: "Name", required: true, placeholder: "e.g. Safe at Home" },
    { type: "textarea", name: "description", label: "Description" },
    { type: "checkbox", name: "isActive", label: "Active" },
  ];

  const columns: DataTableColumn<(typeof programs)[number]>[] = [
    { key: "name", header: "Program", cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "description", header: "Description", cell: (r) => r.description ?? "—" },
    { key: "status", header: "Status", cell: (r) => <ActiveBadge isActive={r.isActive} /> },
    {
      key: "actions",
      header: "",
      cell: (r) => (
        <div className="flex items-center gap-1">
          <EditButton
            title="Edit Program"
            fields={fields}
            defaultValues={{ name: r.name, description: r.description ?? "", isActive: r.isActive }}
            onSubmit={(data) => updateProgramAction(r.id, data)}
          />
          <DeleteProgramButton id={r.id} name={r.name} />
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-3">
      <div className="flex justify-end">
        <EntityDialog
          trigger={
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Add Program
            </Button>
          }
          title="Add Program"
          fields={fields}
          defaultValues={{ isActive: true }}
          onSubmit={createProgramAction}
        />
      </div>
      <DataTable columns={columns} data={programs} rowKey={(r) => r.id} emptyTitle="No programs yet" />
    </section>
  );
}

const GROUP_TYPE_OPTIONS = [
  { value: "PRE_MEDICAL", label: "Pre-Medical" },
  { value: "PRE_ENGINEERING", label: "Pre-Engineering" },
  { value: "ICS", label: "ICS" },
  { value: "ICOM", label: "I.Com" },
  { value: "FA", label: "FA" },
  { value: "OTHER", label: "Other" },
];

export function GroupsSection({ groups }: { groups: { id: string; name: string; type: string; isActive: boolean }[] }) {
  const fields: FieldDef[] = [
    { type: "text", name: "name", label: "Name", required: true, placeholder: "e.g. Pre-Medical" },
    { type: "select", name: "type", label: "Group Type", required: true, options: GROUP_TYPE_OPTIONS },
    { type: "checkbox", name: "isActive", label: "Active" },
  ];

  const columns: DataTableColumn<(typeof groups)[number]>[] = [
    { key: "name", header: "Group", cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "type", header: "Type", cell: (r) => GROUP_TYPE_OPTIONS.find((o) => o.value === r.type)?.label ?? r.type },
    { key: "status", header: "Status", cell: (r) => <ActiveBadge isActive={r.isActive} /> },
    {
      key: "actions",
      header: "",
      cell: (r) => <EditButton title="Edit Group" fields={fields} defaultValues={r} onSubmit={(data) => updateGroupAction(r.id, data)} />,
    },
  ];

  return (
    <section className="space-y-3">
      <div className="flex justify-end">
        <EntityDialog
          trigger={
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Add Group
            </Button>
          }
          title="Add Group"
          fields={fields}
          defaultValues={{ isActive: true }}
          onSubmit={createGroupAction}
        />
      </div>
      <DataTable columns={columns} data={groups} rowKey={(r) => r.id} emptyTitle="No groups yet" />
    </section>
  );
}

export function SubjectsSection({
  subjects,
  levels,
}: {
  subjects: { id: string; name: string; academicLevelId: string | null; academicLevel: { name: string } | null; isActive: boolean }[];
  levels: { id: string; name: string }[];
}) {
  const levelOptions = levels.map((l) => ({ value: l.id, label: l.name }));
  const fields: FieldDef[] = [
    { type: "text", name: "name", label: "Name", required: true, placeholder: "e.g. Physics" },
    { type: "select", name: "academicLevelId", label: "Academic Level (optional = all levels)", options: levelOptions },
    { type: "checkbox", name: "isActive", label: "Active" },
  ];

  const columns: DataTableColumn<(typeof subjects)[number]>[] = [
    { key: "name", header: "Subject", cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "level", header: "Academic Level", cell: (r) => r.academicLevel?.name ?? "All Levels" },
    { key: "status", header: "Status", cell: (r) => <ActiveBadge isActive={r.isActive} /> },
    {
      key: "actions",
      header: "",
      cell: (r) => (
        <EditButton
          title="Edit Subject"
          fields={fields}
          defaultValues={{ name: r.name, academicLevelId: r.academicLevelId ?? "", isActive: r.isActive }}
          onSubmit={(data) => updateSubjectAction(r.id, data)}
        />
      ),
    },
  ];

  return (
    <section className="space-y-3">
      <div className="flex justify-end">
        <EntityDialog
          trigger={
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Add Subject
            </Button>
          }
          title="Add Subject"
          fields={fields}
          defaultValues={{ isActive: true }}
          onSubmit={createSubjectAction}
        />
      </div>
      <DataTable columns={columns} data={subjects} rowKey={(r) => r.id} emptyTitle="No subjects yet" />
    </section>
  );
}

interface BatchItem {
  id: string;
  name: string;
  academicLevel: { name: string };
  maxStudents: number;
  _count: { students: number };
  teachers: { teacher: { fullName: string } }[];
  status: string;
}

export function BatchesSection({ batches }: { batches: BatchItem[] }) {
  const columns: DataTableColumn<BatchItem>[] = [
    { key: "name", header: "Batch", cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "level", header: "Level", cell: (r) => r.academicLevel.name },
    { key: "students", header: "Students", cell: (r) => `${r._count.students} / ${r.maxStudents}` },
    { key: "teachers", header: "Teacher(s)", cell: (r) => r.teachers.map((t) => t.teacher.fullName).join(", ") || "—", hideOnMobile: true },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <section className="space-y-3">
      <div className="flex justify-end">
        <Button asChild size="sm">
          <Link href="/admin/batches/new">
            <Plus className="mr-1.5 h-4 w-4" /> Add Batch
          </Link>
        </Button>
      </div>
      <DataTable columns={columns} data={batches} rowKey={(r) => r.id} rowHref={(r) => `/batches/${r.id}`} emptyTitle="No batches yet" />
    </section>
  );
}
