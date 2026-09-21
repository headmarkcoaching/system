"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { EntityDialog, type FieldDef } from "@/components/shared/entity-dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { updateLeadAction } from "../actions";
import { ConvertButton } from "./convert-button";
import { CounselorSelect } from "./counselor-select";

interface LeadDetail {
  id: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  whatsapp: string | null;
  campaign: string | null;
  notes: string | null;
  weakSubjects: string[];
  stage: string;
  convertedStudentId: string | null;
  createdAt: Date;
  academicLevel: { name: string } | null;
  board: { name: string } | null;
  group: { name: string } | null;
  assignedCounselorId: string | null;
  assignedCounselor: { fullName: string } | null;
}

export function OverviewTab({
  lead,
  canManage,
  isStaff,
  counselors,
}: {
  lead: LeadDetail;
  canManage: boolean;
  isStaff: boolean;
  counselors: { id: string; fullName: string }[];
}) {
  const fields: FieldDef[] = [
    { type: "textarea", name: "notes", label: "Notes" },
    { type: "text", name: "weakSubjectsText", label: "Weak Subjects (comma separated)" },
    { type: "text", name: "campaign", label: "Campaign" },
  ];

  const canConvert = canManage && !lead.convertedStudentId && (lead.stage === "PAYMENT_PENDING" || lead.stage === "COUNSELLING" || lead.stage === "ENROLLED");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3 rounded-lg border border-border p-4">
        <h3 className="font-semibold">Contact Details</h3>
        <dl className="space-y-1.5 text-sm">
          <Row label="Parent" value={lead.parentName} />
          <Row label="Phone" value={lead.parentPhone} />
          <Row label="WhatsApp" value={lead.whatsapp} />
          <Row label="Academic Level" value={lead.academicLevel?.name} />
          <Row label="Board" value={lead.board?.name} />
          <Row label="Group" value={lead.group?.name} />
          <Row label="Campaign" value={lead.campaign} />
          {isStaff ? (
            <div className="flex items-center justify-between gap-3 py-0.5">
              <dt className="text-muted-foreground">Counselor</dt>
              <dd>
                <CounselorSelect leadId={lead.id} assignedCounselorId={lead.assignedCounselorId} counselors={counselors} />
              </dd>
            </div>
          ) : (
            <Row label="Counselor" value={lead.assignedCounselor?.fullName} />
          )}
          <Row label="Created" value={formatDate(lead.createdAt)} />
        </dl>
        {lead.weakSubjects.length > 0 && (
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Weak Subjects</p>
            <div className="flex flex-wrap gap-1.5">
              {lead.weakSubjects.map((s) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Notes &amp; Actions</h3>
          {canManage && (
            <EntityDialog
              trigger={
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              }
              title="Edit Lead"
              fields={fields}
              defaultValues={{ notes: lead.notes ?? "", weakSubjectsText: lead.weakSubjects.join(", "), campaign: lead.campaign ?? "" }}
              onSubmit={(data) => updateLeadAction(lead.id, data)}
            />
          )}
        </div>
        <p className="text-sm text-muted-foreground">{lead.notes || "No notes yet."}</p>

        {lead.convertedStudentId ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/students/${lead.convertedStudentId}`}>View Enrolled Student</Link>
          </Button>
        ) : (
          canConvert && <ConvertButton leadId={lead.id} />
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value || "—"}</dd>
    </div>
  );
}
