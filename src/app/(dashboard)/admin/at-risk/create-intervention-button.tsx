"use client";

import { Button } from "@/components/ui/button";
import { EntityDialog, type FieldDef } from "@/components/shared/entity-dialog";
import { createInterventionAction } from "@/app/(dashboard)/students/[id]/engagement-actions";
import { Plus } from "lucide-react";

export function CreateInterventionButton({
  studentId,
  studentName,
  staffOptions,
}: {
  studentId: string;
  studentName: string;
  staffOptions: { id: string; name: string }[];
}) {
  const fields: FieldDef[] = [
    { type: "textarea", name: "reason", label: "Reason", required: true },
    { type: "textarea", name: "actionPlan", label: "Action Plan", required: true },
    { type: "select", name: "responsibleStaffId", label: "Responsible Staff", required: true, options: staffOptions.map((s) => ({ value: s.id, label: s.name })) },
    { type: "text", name: "startDate", label: "Start Date (YYYY-MM-DD)", required: true, placeholder: "2026-09-05" },
    { type: "text", name: "reviewDate", label: "Review Date (YYYY-MM-DD)", required: true, placeholder: "2026-09-19" },
  ];

  return (
    <EntityDialog
      trigger={
        <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Create Intervention
        </Button>
      }
      title={`Create Intervention — ${studentName}`}
      fields={fields}
      onSubmit={(data) => createInterventionAction(studentId, data)}
    />
  );
}
