"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDoubtAction } from "@/app/(dashboard)/doubts/actions";

export function AskDoubtForm({
  subjects,
  defaultSubjectId,
  defaultChapter,
  defaultTitle,
}: {
  subjects: { subjectId: string; subjectName: string }[];
  defaultSubjectId?: string;
  defaultChapter?: string;
  defaultTitle?: string;
}) {
  const router = useRouter();
  const [subjectId, setSubjectId] = React.useState(subjects.some((s) => s.subjectId === defaultSubjectId) ? (defaultSubjectId as string) : "");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const result = await createDoubtAction(new FormData(e.currentTarget));
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Doubt posted. Your teacher has been notified.");
      router.push(`/doubts/${result.doubtId}`);
    } catch {
      toast.error("Could not post your doubt. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="subjectId">Subject *</Label>
        <Select name="subjectId" value={subjectId} onValueChange={setSubjectId} required>
          <SelectTrigger id="subjectId">
            <SelectValue placeholder="Choose a subject" />
          </SelectTrigger>
          <SelectContent>
            {subjects.map((s) => (
              <SelectItem key={s.subjectId} value={s.subjectId}>
                {s.subjectName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="chapter">Chapter (optional)</Label>
        <Input id="chapter" name="chapter" defaultValue={defaultChapter} placeholder="For example: Chapter 2" maxLength={120} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="title">Short title *</Label>
        <Input id="title" name="title" defaultValue={defaultTitle} required minLength={3} maxLength={140} placeholder="For example: How do I factorise x² + 5x + 6?" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="body">Your doubt *</Label>
        <Textarea id="body" name="body" required minLength={5} maxLength={2000} rows={6} placeholder="Explain what you tried and where you got stuck. The more detail, the better the answer." />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="file" className="flex cursor-pointer items-center gap-1.5 text-sm font-medium">
          <Paperclip className="h-4 w-4" aria-hidden="true" /> {fileName ?? "Attach a photo of the problem (optional)"}
        </Label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".pdf,image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
        />
      </div>

      <Button type="submit" disabled={pending || !subjectId} className="w-full sm:w-auto">
        {pending ? "Posting…" : "Post doubt"}
      </Button>
    </form>
  );
}
