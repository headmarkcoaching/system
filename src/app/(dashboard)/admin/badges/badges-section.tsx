"use client";

import { Pencil, Plus, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { EntityDialog, type FieldDef } from "@/components/shared/entity-dialog";
import { createBadgeAction, updateBadgeAction, awardBadgeAction } from "./actions";

interface BadgeRow {
  id: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
}

const badgeFields: FieldDef[] = [
  { type: "text", name: "name", label: "Name", required: true, placeholder: "e.g. Perfect Attendance" },
  { type: "textarea", name: "description", label: "Description" },
  { type: "text", name: "iconUrl", label: "Icon URL", placeholder: "https://…" },
];

export function BadgesSection({ badges, students }: { badges: BadgeRow[]; students: { id: string; fullName: string; studentCode: string }[] }) {
  const columns: DataTableColumn<BadgeRow>[] = [
    {
      key: "name",
      header: "Badge",
      cell: (r) => (
        <div className="flex items-center gap-2 font-medium">
          <Trophy className="h-4 w-4 text-primary" /> {r.name}
        </div>
      ),
    },
    { key: "description", header: "Description", cell: (r) => r.description ?? "—" },
    {
      key: "actions",
      header: "",
      cell: (r) => (
        <EntityDialog
          trigger={
            <Button variant="ghost" size="sm">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          }
          title="Edit Badge"
          fields={badgeFields}
          defaultValues={{ name: r.name, description: r.description ?? "", iconUrl: r.iconUrl ?? "" }}
          onSubmit={(data) => updateBadgeAction(r.id, data)}
        />
      ),
    },
  ];

  const awardFields: FieldDef[] = [
    { type: "select", name: "studentId", label: "Student", required: true, options: students.map((s) => ({ value: s.id, label: `${s.fullName} (${s.studentCode})` })) },
    { type: "select", name: "badgeId", label: "Badge", required: true, options: badges.map((b) => ({ value: b.id, label: b.name })) },
    { type: "text", name: "note", label: "Note (optional)", placeholder: "Why this badge is being awarded" },
  ];

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap justify-end gap-2">
          <EntityDialog
            trigger={<Button variant="outline" size="sm">Award Badge to Student</Button>}
            title="Award Badge"
            fields={awardFields}
            onSubmit={awardBadgeAction}
          />
          <EntityDialog
            trigger={
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> Add Badge
              </Button>
            }
            title="Add Badge"
            fields={badgeFields}
            onSubmit={createBadgeAction}
          />
        </div>
        <DataTable columns={columns} data={badges} rowKey={(r) => r.id} emptyTitle="No badges yet" emptyDescription="Create a badge, then award it to students from here or from a student's Engagement tab." />
      </section>
    </div>
  );
}
