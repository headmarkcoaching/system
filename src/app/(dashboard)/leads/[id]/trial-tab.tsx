"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { startTrialAction, updateTrialAction } from "../actions";

interface TrialRecord {
  id: string;
  startDate: Date;
  endDate: Date;
  classesAttended: number;
  engagementNotes: string | null;
  enrollmentStatus: string;
  batch: { name: string } | null;
}

export function TrialTab({
  leadId,
  trials,
  batches,
  canManage,
}: {
  leadId: string;
  trials: TrialRecord[];
  batches: { id: string; name: string }[];
  canManage: boolean;
}) {
  const [batchId, setBatchId] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const result = await startTrialAction(leadId, { batchId: batchId || undefined, startDate, endDate });
      if (result && "error" in result && result.error) toast.error(result.error);
      else toast.success("Trial started");
    } catch {
      toast.error("Could not start trial.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {canManage && trials.length === 0 && (
        <form onSubmit={handleStart} className="space-y-3 rounded-lg border border-border p-4">
          <h3 className="font-semibold">Start Free Trial</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Batch (optional)</Label>
              <Select value={batchId} onValueChange={setBatchId}>
                <SelectTrigger><SelectValue placeholder="Select batch" /></SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Starting…" : "Start Trial"}
          </Button>
        </form>
      )}

      {trials.length === 0 ? (
        <EmptyState title="No trial started yet" />
      ) : (
        trials.map((t) => <TrialCard key={t.id} leadId={leadId} trial={t} canManage={canManage} />)
      )}
    </div>
  );
}

function TrialCard({ leadId, trial, canManage }: { leadId: string; trial: TrialRecord; canManage: boolean }) {
  const [classesAttended, setClassesAttended] = React.useState(trial.classesAttended.toString());
  const [engagementNotes, setEngagementNotes] = React.useState(trial.engagementNotes ?? "");
  const [enrollmentStatus, setEnrollmentStatus] = React.useState(trial.enrollmentStatus);
  const [pending, setPending] = React.useState(false);

  async function handleSave() {
    setPending(true);
    try {
      await updateTrialAction(leadId, trial.id, { classesAttended: Number(classesAttended), engagementNotes, enrollmentStatus });
      toast.success("Trial updated");
    } catch {
      toast.error("Could not update trial.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="font-medium">
          {formatDate(trial.startDate)} – {formatDate(trial.endDate)} {trial.batch && `· ${trial.batch.name}`}
        </p>
        <Badge variant="outline">{trial.enrollmentStatus.replace("_", " ")}</Badge>
      </div>
      {canManage ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Classes Attended</Label>
            <Input type="number" min={0} value={classesAttended} onChange={(e) => setClassesAttended(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Engagement Notes</Label>
            <Textarea value={engagementNotes} onChange={(e) => setEngagementNotes(e.target.value)} className="min-h-[38px]" />
          </div>
          <div className="space-y-1.5 sm:col-span-3">
            <Label>Enrollment Status</Label>
            <Select value={enrollmentStatus} onValueChange={setEnrollmentStatus}>
              <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CONVERTED">Converted</SelectItem>
                <SelectItem value="DECLINED">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-3">
            <Button size="sm" onClick={handleSave} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm">Classes Attended: {trial.classesAttended}</p>
          {trial.engagementNotes && <p className="text-sm text-muted-foreground">{trial.engagementNotes}</p>}
        </>
      )}
    </div>
  );
}
