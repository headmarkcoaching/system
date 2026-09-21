"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate, initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { addMessageAction, updateTicketStatusAction, assignTicketAction } from "../actions";

interface Message {
  id: string;
  message: string;
  attachmentUrl: string | null;
  createdAt: Date;
  author: { id: string; name: string };
}

const STATUS_OPTIONS = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "WAITING_FOR_USER", label: "Waiting for User" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

export function TicketThread({
  ticketId,
  status,
  assignedToId,
  messages,
  staffOptions,
  isStaff,
  currentUserId,
}: {
  ticketId: string;
  status: string;
  assignedToId: string | null;
  messages: Message[];
  staffOptions: { id: string; name: string }[];
  isStaff: boolean;
  currentUserId: string;
}) {
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [currentStatus, setCurrentStatus] = React.useState(status);
  const [currentAssignee, setCurrentAssignee] = React.useState(assignedToId ?? "");

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    try {
      await addMessageAction(ticketId, text.trim());
      setText("");
      toast.success("Reply sent");
    } catch {
      toast.error("Could not send reply.");
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(value: string) {
    setCurrentStatus(value);
    try {
      await updateTicketStatusAction(ticketId, value as never);
      toast.success("Status updated");
    } catch {
      toast.error("Could not update status.");
    }
  }

  async function handleAssigneeChange(value: string) {
    setCurrentAssignee(value);
    try {
      await assignTicketAction(ticketId, value || null);
      toast.success("Assignment updated");
    } catch {
      toast.error("Could not update assignment.");
    }
  }

  return (
    <div className="space-y-6">
      {isStaff && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Manage Ticket</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Select value={currentStatus} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={currentAssignee} onValueChange={handleAssigneeChange}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {staffOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Conversation <StatusBadge status={currentStatus} />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {messages.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No replies yet.</p>
          ) : (
            <ul className="space-y-3">
              {messages.map((m) => (
                <li key={m.id} className={`flex gap-3 ${m.author.id === currentUserId ? "flex-row-reverse text-right" : ""}`}>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback>{initials(m.author.name)}</AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[75%] rounded-lg border border-border p-3 text-sm ${m.author.id === currentUserId ? "bg-primary/10" : "bg-muted/40"}`}>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      {m.author.name} · {formatDate(m.createdAt)}{" "}
                      {new Date(m.createdAt).toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" })}
                    </p>
                    <p className="whitespace-pre-wrap">{m.message}</p>
                    {m.attachmentUrl && (
                      <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs text-primary underline">
                        Attachment
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 border-t border-border pt-4">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a reply…" rows={3} />
            <Button onClick={handleSend} disabled={sending || !text.trim()}>
              {sending ? "Sending…" : "Send Reply"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
