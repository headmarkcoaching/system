"use client";

import * as React from "react";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { sendBulkOverdueRemindersAction } from "./actions";

export function SendBulkReminderButton({ overdueCount }: { overdueCount: number }) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  if (overdueCount === 0) return null;

  async function handleConfirm() {
    setPending(true);
    try {
      const result = await sendBulkOverdueRemindersAction();
      if (result.studentsNotified > 0) {
        toast.success(`Reminders sent to ${result.parentsNotified} parent${result.parentsNotified === 1 ? "" : "s"} across ${result.studentsNotified} student${result.studentsNotified === 1 ? "" : "s"}.`);
      } else {
        toast.error("No parent contact on file for any overdue student.");
      }
      setOpen(false);
    } catch {
      toast.error("Could not send bulk reminders.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Megaphone className="mr-1.5 h-3.5 w-3.5" /> Remind All Overdue ({overdueCount})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send reminder to every overdue student?</DialogTitle>
          <DialogDescription>
            This sends one WhatsApp message, one email (where on file), and one in-app notification to the parent(s) of all {overdueCount} currently overdue student{overdueCount === 1 ? "" : "s"} — about their oldest overdue installment. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={pending}>
            {pending ? "Sending…" : `Send to ${overdueCount}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
