"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { addLeadFollowupAction, completeLeadFollowupAction } from "../actions";

interface Followup {
  id: string;
  dueDate: Date;
  notes: string | null;
  completed: boolean;
}

export function FollowupsTab({ leadId, followups, canManage }: { leadId: string; followups: Followup[]; canManage: boolean }) {
  const [dueDate, setDueDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const result = await addLeadFollowupAction(leadId, dueDate, notes || undefined);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Follow-up scheduled");
        setDueDate("");
        setNotes("");
      }
    } catch {
      toast.error("Could not schedule follow-up.");
    } finally {
      setPending(false);
    }
  }

  async function handleComplete(id: string) {
    try {
      await completeLeadFollowupAction(leadId, id);
      toast.success("Marked complete");
    } catch {
      toast.error("Could not update follow-up.");
    }
  }

  const now = new Date();
  const pending_ = followups.filter((f) => !f.completed);
  const done = followups.filter((f) => f.completed);

  return (
    <div className="space-y-4">
      {canManage && (
        <form onSubmit={handleAdd} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="sm:w-44" required />
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="flex-1" />
          <Button type="submit" disabled={pending} className="shrink-0">
            {pending ? "Saving…" : "Schedule Follow-up"}
          </Button>
        </form>
      )}

      {followups.length === 0 ? (
        <EmptyState title="No follow-ups scheduled" />
      ) : (
        <div className="space-y-4">
          <ul className="space-y-2">
            {pending_.map((f) => {
              const overdue = f.dueDate < now;
              return (
                <li key={f.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{formatDate(f.dueDate)}</span>
                      {overdue && <Badge variant="destructive">Overdue</Badge>}
                    </div>
                    {f.notes && <p className="text-xs text-muted-foreground">{f.notes}</p>}
                  </div>
                  {canManage && (
                    <Button variant="outline" size="sm" onClick={() => handleComplete(f.id)}>
                      <Check className="mr-1.5 h-3.5 w-3.5" /> Done
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          {done.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Completed</p>
              <ul className="space-y-1.5">
                {done.map((f) => (
                  <li key={f.id} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground">
                    <span>{formatDate(f.dueDate)}</span>
                    <Badge variant="outline">Done</Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
