"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Send, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import {
  generateParentReportAction,
  updateParentReportAction,
  markParentReportSentAction,
  draftParentReportNarrativeAction,
  approveParentReportAction,
} from "./parent-reports-actions";

interface Report {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  attendancePercent: number;
  homeworkCompletionPercent: number;
  overallScore: number | null;
  teacherFeedback: string | null;
  weakAreas: string | null;
  nextWeekGoal: string | null;
  sentAt: Date | null;
  aiDrafted: boolean;
  approvedAt: Date | null;
}

export function ParentReportsTab({ studentId, reports, canManage }: { studentId: string; reports: Report[]; canManage: boolean }) {
  const router = useRouter();
  const [generating, setGenerating] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  async function handleGenerate() {
    setGenerating(true);
    try {
      await generateParentReportAction(studentId);
      toast.success("Report generated");
      router.refresh();
    } catch {
      toast.error("Could not generate report.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <Button size="sm" onClick={handleGenerate} disabled={generating}>
          <Plus className="mr-1.5 h-4 w-4" /> {generating ? "Generating…" : "Generate Report (last 7 days)"}
        </Button>
      )}

      {reports.length === 0 ? (
        <EmptyState title="No reports generated yet" />
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {formatDate(r.periodStart)} – {formatDate(r.periodEnd)}
                </p>
                <div className="flex items-center gap-2">
                  <ReportStatusBadge report={r} />
                  {canManage && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(editingId === r.id ? null : r.id)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <span>Attendance: {Math.round(r.attendancePercent)}%</span>
                <span>Homework: {Math.round(r.homeworkCompletionPercent)}%</span>
                <span>Score: {r.overallScore != null ? Math.round(r.overallScore) : "—"}</span>
              </div>

              {editingId === r.id ? (
                <ReportEditForm studentId={studentId} report={r} onDone={() => setEditingId(null)} />
              ) : (
                <>
                  {r.teacherFeedback && <p className="text-sm">&ldquo;{r.teacherFeedback}&rdquo;</p>}
                  {r.weakAreas && <p className="text-xs text-muted-foreground">Weak areas: {r.weakAreas}</p>}
                  {r.nextWeekGoal && <p className="text-xs text-muted-foreground">Next goal: {r.nextWeekGoal}</p>}
                  {canManage && !r.sentAt && <ReportActions studentId={studentId} report={r} />}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReportStatusBadge({ report }: { report: Report }) {
  if (report.sentAt) return <Badge variant="success">Sent</Badge>;
  if (report.aiDrafted && report.approvedAt) return <Badge variant="success">Approved</Badge>;
  if (report.aiDrafted) return <Badge variant="warning">Pending Approval</Badge>;
  return <Badge variant="outline">Draft</Badge>;
}

function ReportActions({ studentId, report }: { studentId: string; report: Report }) {
  const router = useRouter();
  const [pending, setPending] = React.useState<"draft" | "approve" | "send" | null>(null);

  async function handleDraft() {
    setPending("draft");
    try {
      await draftParentReportNarrativeAction(studentId, report.id);
      toast.success(report.aiDrafted ? "Draft regenerated" : "AI draft ready — review before approving");
      router.refresh();
    } catch {
      toast.error("Couldn't draft the report.");
    } finally {
      setPending(null);
    }
  }

  async function handleApprove() {
    setPending("approve");
    try {
      await approveParentReportAction(studentId, report.id);
      toast.success("Report approved — ready to send");
      router.refresh();
    } catch {
      toast.error("Couldn't approve the report.");
    } finally {
      setPending(null);
    }
  }

  async function handleSend() {
    setPending("send");
    try {
      const result = await markParentReportSentAction(studentId, report.id);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Marked as sent to parent");
        router.refresh();
      }
    } catch {
      toast.error("Couldn't mark the report as sent.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={handleDraft} disabled={pending !== null}>
        <Sparkles className="mr-1.5 h-3.5 w-3.5" /> {pending === "draft" ? "Drafting…" : report.aiDrafted ? "Regenerate with AI" : "Draft with AI"}
      </Button>
      {report.aiDrafted && !report.approvedAt && (
        <Button variant="outline" size="sm" onClick={handleApprove} disabled={pending !== null}>
          <Check className="mr-1.5 h-3.5 w-3.5" /> {pending === "approve" ? "Approving…" : "Approve"}
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={handleSend} disabled={pending !== null}>
        <Send className="mr-1.5 h-3.5 w-3.5" /> {pending === "send" ? "Sending…" : "Mark Sent"}
      </Button>
    </div>
  );
}

function ReportEditForm({ studentId, report, onDone }: { studentId: string; report: Report; onDone: () => void }) {
  const router = useRouter();
  const [teacherFeedback, setTeacherFeedback] = React.useState(report.teacherFeedback ?? "");
  const [weakAreas, setWeakAreas] = React.useState(report.weakAreas ?? "");
  const [nextWeekGoal, setNextWeekGoal] = React.useState(report.nextWeekGoal ?? "");
  const [pending, setPending] = React.useState(false);

  async function handleSave() {
    setPending(true);
    try {
      await updateParentReportAction(studentId, report.id, { teacherFeedback, weakAreas, nextWeekGoal });
      toast.success("Report updated");
      onDone();
      router.refresh();
    } catch {
      toast.error("Could not save changes.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2 rounded-md bg-muted/30 p-3">
      {report.aiDrafted && <p className="text-xs text-muted-foreground">Editing this AI-drafted content will require re-approval before it can be sent.</p>}
      <div className="space-y-1">
        <Label className="text-xs">Teacher Feedback</Label>
        <Textarea value={teacherFeedback} onChange={(e) => setTeacherFeedback(e.target.value)} className="min-h-[60px]" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Weak Areas</Label>
        <Textarea value={weakAreas} onChange={(e) => setWeakAreas(e.target.value)} className="min-h-[40px]" />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Next Week Goal</Label>
        <Textarea value={nextWeekGoal} onChange={(e) => setNextWeekGoal(e.target.value)} className="min-h-[40px]" />
      </div>
      <Button size="sm" onClick={handleSave} disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
