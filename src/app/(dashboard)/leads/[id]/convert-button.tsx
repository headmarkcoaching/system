"use client";

import { useRouter } from "next/navigation";
import { UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityDialog, type FieldDef } from "@/components/shared/entity-dialog";
import { convertLeadToStudentAction } from "../actions";

// A payment plan is required as part of conversion, not an optional follow-up — a student
// created without one has no fee tracking at all until someone notices and sets it up later.
export function ConvertButton({ leadId }: { leadId: string }) {
  const router = useRouter();

  const fields: FieldDef[] = [
    { type: "number", name: "totalFee", label: "Total Fee (PKR)", required: true },
    { type: "number", name: "numberOfInstallments", label: "Number of Installments", required: true },
    { type: "text", name: "firstDueDate", label: "First Due Date (YYYY-MM-DD)", required: true },
  ];

  return (
    <EntityDialog
      trigger={
        <Button size="sm">
          <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Convert to Student
        </Button>
      }
      title="Convert this lead to a student?"
      description="This creates a real student profile from the lead's details, marks the lead as Enrolled, and sets up their fee plan."
      fields={fields}
      submitLabel="Convert & Set Up Fee Plan"
      onSubmit={(data) => convertLeadToStudentAction(leadId, data)}
      onSuccess={(result) => {
        const studentId = (result as { studentId?: string } | undefined)?.studentId;
        if (studentId) router.push(`/students/${studentId}`);
      }}
    />
  );
}
