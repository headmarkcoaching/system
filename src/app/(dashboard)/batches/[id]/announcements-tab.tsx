"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityDialog, type FieldDef } from "@/components/shared/entity-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { createBatchAnnouncementAction } from "@/app/(dashboard)/admin/announcements/actions";

interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  publishedAt: Date;
}

export function AnnouncementsTab({ batchId, announcements, canManage }: { batchId: string; announcements: AnnouncementItem[]; canManage: boolean }) {
  const fields: FieldDef[] = [
    { type: "text", name: "title", label: "Title", required: true },
    { type: "textarea", name: "message", label: "Message", required: true },
  ];

  return (
    <div className="space-y-4">
      {canManage && (
        <EntityDialog
          trigger={
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> New Announcement
            </Button>
          }
          title="New Batch Announcement"
          description="Sent to every enrolled student in this batch with a linked account."
          fields={fields}
          onSubmit={(data) => createBatchAnnouncementAction(batchId, data)}
        />
      )}

      {announcements.length === 0 ? (
        <EmptyState title="No announcements yet" />
      ) : (
        <ul className="space-y-2">
          {announcements.map((a) => (
            <li key={a.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">{a.title}</p>
                <span className="text-xs text-muted-foreground">{formatDate(a.publishedAt)}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{a.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
