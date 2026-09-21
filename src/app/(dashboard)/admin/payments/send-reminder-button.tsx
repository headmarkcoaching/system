"use client";

import * as React from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendPaymentReminderAction } from "./actions";

export function SendReminderButton({ installmentId }: { installmentId: string }) {
  const [pending, setPending] = React.useState(false);

  async function handleClick() {
    setPending(true);
    try {
      const result = await sendPaymentReminderAction(installmentId);
      if (result.parentsNotified > 0) {
        toast.success(`Reminder sent to ${result.parentsNotified} parent${result.parentsNotified === 1 ? "" : "s"}.`);
      } else {
        toast.error("No parent contact on file for this student.");
      }
    } catch {
      toast.error("Could not send reminder.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={pending} className="relative z-10">
      <Send className="mr-1.5 h-3.5 w-3.5" />
      {pending ? "Sending…" : "Send Reminder"}
    </Button>
  );
}
