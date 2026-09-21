"use client";

import * as React from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { askStudyAssistantAction } from "./actions";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  groundedInKnowledgeBase?: boolean;
  matchedDocumentTitles?: string[];
}

export function StudyAssistantChat({ profileSummary }: { profileSummary: string }) {
  const [conversationId] = React.useState(() => crypto.randomUUID());
  const [turns, setTurns] = React.useState<ChatTurn[]>([]);
  const [question, setQuestion] = React.useState("");
  const [sending, setSending] = React.useState(false);

  async function handleSend() {
    const text = question.trim();
    if (!text) return;

    setTurns((prev) => [...prev, { role: "user", content: text }]);
    setQuestion("");
    setSending(true);
    try {
      const result = await askStudyAssistantAction(conversationId, text);
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: result.answer, groundedInKnowledgeBase: result.groundedInKnowledgeBase, matchedDocumentTitles: result.matchedDocumentTitles },
      ]);
    } catch {
      toast.error("Couldn't get an answer. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <p className="text-xs text-muted-foreground">Answering as: {profileSummary}</p>

        {turns.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Ask anything about your subjects — e.g. &quot;Explain Newton&apos;s Third Law.&quot;
          </div>
        ) : (
          <ul className="space-y-3">
            {turns.map((t, i) => (
              <li key={i} className={`flex gap-3 ${t.role === "user" ? "flex-row-reverse text-right" : ""}`}>
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback>{t.role === "user" ? "You" : "AI"}</AvatarFallback>
                </Avatar>
                <div className={`max-w-[75%] rounded-lg border border-border p-3 text-sm ${t.role === "user" ? "bg-primary/10" : "bg-muted/40"}`}>
                  <p className="whitespace-pre-wrap">{t.content}</p>
                  {t.role === "assistant" && t.groundedInKnowledgeBase && t.matchedDocumentTitles && t.matchedDocumentTitles.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {t.matchedDocumentTitles.map((title) => (
                        <Badge key={title} variant="outline" className="text-xs">
                          Grounded in: {title}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 border-t border-border pt-4">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question…"
            rows={2}
          />
          <Button onClick={handleSend} disabled={sending || !question.trim()}>
            <Send className="mr-1.5 h-3.5 w-3.5" /> {sending ? "Thinking…" : "Send"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
