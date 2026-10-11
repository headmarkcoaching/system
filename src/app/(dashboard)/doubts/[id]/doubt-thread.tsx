"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Conversation, type ConversationItem } from "@/components/shared/conversation";
import { replyDoubtAction, resolveDoubtAction } from "../actions";

export function DoubtThread({
  doubtId,
  status,
  items,
  currentUserId,
}: {
  doubtId: string;
  status: string;
  items: ConversationItem[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [resolving, setResolving] = React.useState(false);

  async function handleResolve() {
    setResolving(true);
    try {
      await resolveDoubtAction(doubtId);
      toast.success("Marked as resolved");
      router.refresh();
    } catch {
      toast.error("Could not update the doubt.");
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="space-y-5">
      <Conversation
        items={items}
        currentUserId={currentUserId}
        canReply
        onSend={(fd) => replyDoubtAction(doubtId, fd)}
        placeholder={status === "RESOLVED" ? "Still stuck? Write a follow-up to reopen this doubt…" : "Write a reply…"}
        sendLabel="Send reply"
      />
      {status !== "RESOLVED" && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={handleResolve} disabled={resolving}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden="true" /> {resolving ? "Saving…" : "Mark as resolved"}
          </Button>
        </div>
      )}
    </div>
  );
}
