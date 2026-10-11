"use client";

import * as React from "react";
import { Conversation, type ConversationItem } from "@/components/shared/conversation";
import { replyThreadAction, markThreadReadAction } from "../actions";

export function MessageThread({
  threadId,
  items,
  currentUserId,
  canReply,
  markRead,
}: {
  threadId: string;
  items: ConversationItem[];
  currentUserId: string;
  canReply: boolean;
  markRead: boolean;
}) {
  // Opening the conversation clears its "New" badge for the person reading it. Admins reading for
  // oversight do not mark anything read.
  React.useEffect(() => {
    if (markRead) void markThreadReadAction(threadId);
  }, [threadId, markRead]);

  return (
    <Conversation
      items={items}
      currentUserId={currentUserId}
      canReply={canReply}
      onSend={(fd) => replyThreadAction(threadId, fd)}
      placeholder="Write a message…"
      sendLabel="Send"
      lockedNote="You are reading this conversation as an admin. Only the family and the teacher can post in it."
    />
  );
}
