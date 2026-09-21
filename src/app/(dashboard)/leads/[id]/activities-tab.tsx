"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { addLeadActivityAction } from "../actions";

const TYPES = ["CALL", "WHATSAPP", "EMAIL", "SMS", "MEETING", "NOTE"];

interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt: Date;
}

export function ActivitiesTab({ leadId, activities, canManage }: { leadId: string; activities: Activity[]; canManage: boolean }) {
  const [type, setType] = React.useState("CALL");
  const [description, setDescription] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const result = await addLeadActivityAction(leadId, type, description);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Activity logged");
        setDescription("");
      }
    } catch {
      toast.error("Could not log activity.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happened?" className="min-h-[40px] flex-1" />
          <Button type="submit" disabled={pending} className="shrink-0">
            {pending ? "Logging…" : "Log Activity"}
          </Button>
        </form>
      )}

      {activities.length === 0 ? (
        <EmptyState title="No activity logged yet" />
      ) : (
        <ul className="space-y-2">
          {activities.map((a) => (
            <li key={a.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{a.type}</span>
                <span className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm">{a.description}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
