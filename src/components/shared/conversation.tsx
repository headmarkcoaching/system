"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn, formatDate, initials } from "@/lib/utils";

export interface ConversationAttachment {
  id: string;
  filename: string;
  mimeType: string;
}

export interface ConversationItem {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: Date;
  attachment: ConversationAttachment | null;
}

export function AttachmentView({ attachment }: { attachment: ConversationAttachment }) {
  const href = `/api/files/${attachment.id}`;
  if (attachment.mimeType.startsWith("image/")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="mt-2 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={href} alt={attachment.filename} className="max-h-64 max-w-full rounded-md border border-border" />
      </a>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary underline">
      <Paperclip className="h-3.5 w-3.5" aria-hidden="true" /> {attachment.filename}
    </a>
  );
}

export function Conversation({
  items,
  currentUserId,
  canReply,
  onSend,
  placeholder = "Write a reply…",
  sendLabel = "Send",
  lockedNote,
}: {
  items: ConversationItem[];
  currentUserId: string;
  canReply: boolean;
  onSend: (formData: FormData) => Promise<{ error?: string }>;
  placeholder?: string;
  sendLabel?: string;
  lockedNote?: string;
}) {
  const router = useRouter();
  const [text, setText] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [sending, setSending] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);

  async function handleSend() {
    if (!text.trim()) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.set("body", text.trim());
      if (file) formData.set("file", file);
      const result = await onSend(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setText("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    } catch {
      toast.error("Could not send. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-5">
      <ul className="space-y-3">
        {items.map((m) => {
          const mine = m.authorId === currentUserId;
          return (
            <li key={m.id} className={cn("flex gap-3", mine && "flex-row-reverse")}>
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback>{initials(m.authorName)}</AvatarFallback>
              </Avatar>
              <div className={cn("max-w-[80%] rounded-lg border border-border p-3 text-sm", mine ? "bg-primary/10" : "bg-muted/40")}>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  {m.authorName} · {formatDate(m.createdAt)}{" "}
                  {new Date(m.createdAt).toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" })}
                </p>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                {m.attachment && <AttachmentView attachment={m.attachment} />}
              </div>
            </li>
          );
        })}
      </ul>

      {canReply ? (
        <div className="space-y-2 border-t border-border pt-4">
          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} rows={3} maxLength={2000} aria-label={placeholder} />
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
              <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />
              {file ? file.name : "Attach a photo or file"}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {file && (
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground"
                aria-label="Remove attachment"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <Button onClick={handleSend} disabled={sending || !text.trim()} className="ml-auto">
              <Send className="mr-1.5 h-4 w-4" aria-hidden="true" /> {sending ? "Sending…" : sendLabel}
            </Button>
          </div>
        </div>
      ) : (
        lockedNote && <p className="border-t border-border pt-4 text-sm text-muted-foreground">{lockedNote}</p>
      )}
    </div>
  );
}
