"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntityDialog, type FieldDef } from "@/components/shared/entity-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate, formatTime } from "@/lib/utils";
import { createLiveClassAction, updateLiveClassStatusAction } from "@/app/(dashboard)/admin/batches/actions";

type LiveClassStatus = "UPCOMING" | "LIVE" | "COMPLETED" | "CANCELLED";

export function ClassesTab({
  batchId,
  classes,
  subjects,
  teachers,
  canManage,
}: {
  batchId: string;
  classes: {
    id: string;
    title: string;
    status: LiveClassStatus;
    scheduledDate: Date;
    startTime: string;
    endTime: string;
    meetingLink: string;
    subject: { name: string };
    teacher: { fullName: string };
  }[];
  subjects: { id: string; name: string }[];
  teachers: { id: string; fullName: string }[];
  canManage: boolean;
}) {
  const fields: FieldDef[] = [
    { type: "text", name: "title", label: "Class Title", required: true, placeholder: "e.g. Chapter 5 — Kinematics" },
    { type: "select", name: "subjectId", label: "Subject", required: true, options: subjects.map((s) => ({ value: s.id, label: s.name })) },
    { type: "text", name: "chapter", label: "Chapter" },
    { type: "select", name: "teacherId", label: "Teacher", required: true, options: teachers.map((t) => ({ value: t.id, label: t.fullName })) },
    { type: "text", name: "scheduledDate", label: "Date (YYYY-MM-DD)", required: true },
    { type: "text", name: "startTime", label: "Start Time (HH:mm)", required: true, placeholder: "16:00" },
    { type: "text", name: "endTime", label: "End Time (HH:mm)", required: true, placeholder: "17:00" },
    {
      type: "select",
      name: "meetingProvider",
      label: "Meeting Provider",
      required: true,
      options: [
        { value: "ZOOM", label: "Zoom" },
        { value: "GOOGLE_MEET", label: "Google Meet" },
        { value: "CUSTOM", label: "Custom Link" },
      ],
    },
    { type: "text", name: "meetingLink", label: "Meeting Link (leave blank for Google Meet to auto-create one)", placeholder: "https://…" },
  ];

  return (
    <div className="space-y-4">
      {canManage && (
        <EntityDialog
          trigger={
            <Button size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Schedule Live Class
            </Button>
          }
          title="Schedule Live Class"
          fields={fields}
          onSubmit={(data) => createLiveClassAction(batchId, data)}
        />
      )}

      {classes.length === 0 ? (
        <EmptyState title="No live classes scheduled yet" />
      ) : (
        <ul className="space-y-2">
          {classes.map((c) => (
            <li key={c.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{c.title}</p>
                <p className="text-xs text-muted-foreground">
                  {c.subject.name} · {c.teacher.fullName} · {formatDate(c.scheduledDate)} · {formatTime(c.startTime)}–{formatTime(c.endTime)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a href={c.meetingLink} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <Video className="mr-1.5 h-3.5 w-3.5" /> Open Link
                  </Button>
                </a>
                {canManage ? (
                  <Select defaultValue={c.status} onValueChange={(v) => updateLiveClassStatusAction(batchId, c.id, v as LiveClassStatus).then(() => toast.success("Status updated"))}>
                    <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UPCOMING">Upcoming</SelectItem>
                      <SelectItem value="LIVE">Live Now</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <StatusBadge status={c.status} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
