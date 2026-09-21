"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { changeLeadStageAction } from "@/app/(dashboard)/leads/actions";
import { cn, formatDate } from "@/lib/utils";

const STAGES: { value: string; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "ASSESSMENT_BOOKED", label: "Assessment Booked" },
  { value: "ASSESSMENT_COMPLETED", label: "Assessment Completed" },
  { value: "FREE_TRIAL", label: "Free Trial" },
  { value: "COUNSELLING", label: "Counselling" },
  { value: "PAYMENT_PENDING", label: "Payment Pending" },
  { value: "ENROLLED", label: "Enrolled" },
  { value: "LOST", label: "Lost" },
];

export interface LeadBoardItem {
  id: string;
  studentName: string;
  parentName: string;
  parentPhone: string;
  source: string;
  stage: string;
  academicLevel: { name: string } | null;
  followups: { dueDate: Date | string }[];
}

// Native HTML5 drag-and-drop — no extra dependency for a board this small, and every card
// also carries a Select as a keyboard/touch-friendly fallback for moving between stages.
export function LeadsBoard({ leads: initialLeads }: { leads: LeadBoardItem[] }) {
  const [leads, setLeads] = React.useState(initialLeads);
  const [dragOverStage, setDragOverStage] = React.useState<string | null>(null);

  React.useEffect(() => setLeads(initialLeads), [initialLeads]);

  async function moveLead(leadId: string, stage: string) {
    const previous = leads;
    const current = previous.find((l) => l.id === leadId);
    if (!current || current.stage === stage) return;

    setLeads((rows) => rows.map((r) => (r.id === leadId ? { ...r, stage } : r)));
    try {
      await changeLeadStageAction(leadId, stage);
      toast.success("Stage updated");
    } catch {
      setLeads(previous);
      toast.error("Could not update stage.");
    }
  }

  if (leads.length === 0) {
    return <EmptyState title="No leads assigned yet" />;
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {STAGES.map((stageOption) => {
        const columnLeads = leads.filter((l) => l.stage === stageOption.value);
        return (
          <div
            key={stageOption.value}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStage(stageOption.value);
            }}
            onDragLeave={() => setDragOverStage((s) => (s === stageOption.value ? null : s))}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverStage(null);
              const leadId = e.dataTransfer.getData("text/plain");
              if (leadId) moveLead(leadId, stageOption.value);
            }}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-lg border border-border bg-muted/30 transition-colors",
              dragOverStage === stageOption.value && "border-primary bg-primary/5"
            )}
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-sm font-semibold">{stageOption.label}</span>
              <span className="rounded-full bg-background px-2 py-0.5 text-xs text-muted-foreground">{columnLeads.length}</span>
            </div>
            <div className="flex max-h-[calc(100vh-320px)] min-h-[80px] flex-col gap-2 overflow-y-auto p-2">
              {columnLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} onMove={moveLead} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LeadCard({ lead, onMove }: { lead: LeadBoardItem; onMove: (leadId: string, stage: string) => void }) {
  const dueFollowup = lead.followups[0];
  const overdue = dueFollowup && new Date(dueFollowup.dueDate) < new Date();

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", lead.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="cursor-grab space-y-2 rounded-md border border-border bg-background p-3 text-sm shadow-sm active:cursor-grabbing"
    >
      <Link href={`/leads/${lead.id}`} className="block hover:underline">
        <p className="font-medium">{lead.studentName}</p>
      </Link>
      <p className="text-xs text-muted-foreground">
        {lead.parentName} · {lead.parentPhone}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {lead.academicLevel && <Badge variant="outline">{lead.academicLevel.name}</Badge>}
        <StatusBadge status={lead.source} />
      </div>
      {dueFollowup && (
        <p className="text-xs">
          <span className="text-muted-foreground">Follow-up: </span>
          <span className={overdue ? "font-medium text-destructive" : "text-muted-foreground"}>{formatDate(dueFollowup.dueDate)}{overdue ? " (overdue)" : ""}</span>
        </p>
      )}
      <Select value={lead.stage} onValueChange={(value) => onMove(lead.id, value)}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STAGES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
