"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityDialog, type FieldDef } from "@/components/shared/entity-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/utils";
import { logCommunicationAction } from "./communication-actions";

interface CommunicationEntry {
  id: string;
  type: string;
  subject: string | null;
  messageSummary: string;
  status: string;
  createdAt: Date;
  staff: { name: string };
}

const TYPE_OPTIONS = [
  { value: "CALL", label: "Phone Call" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
  { value: "IN_PERSON", label: "In Person" },
  { value: "SYSTEM", label: "System" },
];

export function CommunicationTab({ studentId, logs, canManage }: { studentId: string; logs: CommunicationEntry[]; canManage: boolean }) {
  const fields: FieldDef[] = [
    { type: "select", name: "type", label: "Type", required: true, options: TYPE_OPTIONS },
    { type: "text", name: "subject", label: "Subject" },
    { type: "textarea", name: "messageSummary", label: "Summary", required: true },
  ];

  return (
    <div className="space-y-4">
      {canManage && (
        <EntityDialog
          trigger={
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Log Communication
            </Button>
          }
          title="Log Communication"
          fields={fields}
          onSubmit={(data) => logCommunicationAction(studentId, data)}
        />
      )}

      {logs.length === 0 ? (
        <EmptyState title="No communication logged yet" />
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li key={log.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{log.type.replace("_", " ")}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={log.status} />
                  <span className="text-xs text-muted-foreground">{formatDate(log.createdAt)}</span>
                </div>
              </div>
              {log.subject && <p className="mt-1 text-sm font-medium">{log.subject}</p>}
              <p className="text-sm text-muted-foreground">{log.messageSummary}</p>
              <p className="mt-1 text-xs text-muted-foreground">Logged by {log.staff.name}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
