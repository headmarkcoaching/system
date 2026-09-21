"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { generateLessonSummaryAction } from "./actions";

export function LessonSummaryPanel({ subjects }: { subjects: { id: string; name: string }[] }) {
  const [subjectId, setSubjectId] = React.useState("");
  const [chapter, setChapter] = React.useState("");
  const [sourceText, setSourceText] = React.useState("");
  const [result, setResult] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleGenerate() {
    if (!subjectId || !chapter || !sourceText.trim()) {
      toast.error("Fill in subject, chapter, and source notes first.");
      return;
    }
    setPending(true);
    setResult(null);
    try {
      const text = await generateLessonSummaryAction({ subjectId, chapter, sourceText });
      setResult(text);
    } catch {
      toast.error("Couldn't generate a lesson summary.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4 text-primary" /> Generate Lesson Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger>
            <SelectValue placeholder="Select subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="space-y-1.5">
          <Label className="text-xs">Chapter</Label>
          <Input value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="e.g. Chapter 4: Quadratic Equations" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Source Notes</Label>
          <Textarea value={sourceText} onChange={(e) => setSourceText(e.target.value)} className="min-h-[100px]" placeholder="Paste your lesson notes here…" />
        </div>
        <Button size="sm" onClick={handleGenerate} disabled={pending}>
          {pending ? "Generating…" : "Generate Summary"}
        </Button>
        {result && <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-sm">{result}</p>}
      </CardContent>
    </Card>
  );
}
