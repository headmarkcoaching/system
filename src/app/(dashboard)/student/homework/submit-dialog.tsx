"use client";

import * as React from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { submitHomeworkAction } from "@/app/(dashboard)/admin/batches/actions";

export function SubmitHomeworkDialog({ homeworkId, submissionId, title }: { homeworkId: string; submissionId: string; title: string }) {
  const [open, setOpen] = React.useState(false);
  const [attachmentUrl, setAttachmentUrl] = React.useState("");
  const [comments, setComments] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit() {
    setPending(true);
    try {
      const formData = new FormData();
      if (attachmentUrl) formData.set("attachmentUrl", attachmentUrl);
      if (comments) formData.set("studentComments", comments);
      if (file) formData.set("file", file);
      await submitHomeworkAction(homeworkId, submissionId, formData);
      toast.success("Homework submitted");
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit homework.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="mr-1.5 h-3.5 w-3.5" /> Submit
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit — {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Attachment Link (optional)</Label>
            <Input value={attachmentUrl} onChange={(e) => setAttachmentUrl(e.target.value)} placeholder="Link to your work (Drive, photo, etc.)" />
          </div>
          <div className="space-y-1.5">
            <Label>Or Upload a File (optional — PDF, Word, image, max 10MB)</Label>
            <Input type="file" accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div className="space-y-1.5">
            <Label>Comments (optional)</Label>
            <Textarea value={comments} onChange={(e) => setComments(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? "Submitting…" : "Submit Homework"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
