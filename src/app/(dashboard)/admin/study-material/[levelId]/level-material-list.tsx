"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { createStudyMaterialAction, deleteStudyMaterialAction } from "../actions";

const TYPE_OPTIONS = [
  { value: "PDF", label: "PDF" },
  { value: "NOTES", label: "Notes" },
  { value: "PAST_PAPER", label: "Past Paper" },
  { value: "WORKSHEET", label: "Worksheet" },
  { value: "ASSIGNMENT", label: "Assignment" },
];

interface MaterialItem {
  id: string;
  title: string;
  type: string;
  chapter: string | null;
  fileId: string | null;
  fileUrl: string | null;
  subject: { name: string };
}

export function LevelMaterialList({
  levelId,
  materials,
  subjects,
}: {
  levelId: string;
  materials: MaterialItem[];
  subjects: { id: string; name: string }[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <UploadMaterialDialog levelId={levelId} subjects={subjects} />
      </div>

      {materials.length === 0 ? (
        <EmptyState title="No study material for this level yet" description="Upload the first one above." />
      ) : (
        <ul className="space-y-2">
          {materials.map((m) => (
            <li key={m.id} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{m.title}</p>
                  <Badge variant="outline">{m.subject.name}</Badge>
                  {!m.fileId && (
                    <Badge variant="secondary" className="text-[10px]">
                      Legacy link — not view-protected
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {TYPE_OPTIONS.find((t) => t.value === m.type)?.label}
                  {m.chapter && ` · ${m.chapter}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <a href={m.fileId ? `/api/files/${m.fileId}` : m.fileUrl ?? "#"} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <FileText className="h-3.5 w-3.5" />
                  </Button>
                </a>
                <DeleteButton id={m.id} levelId={levelId} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function UploadMaterialDialog({ levelId, subjects }: { levelId: string; subjects: { id: string; name: string }[] }) {
  const [open, setOpen] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState("NOTES");
  const [subjectId, setSubjectId] = React.useState("");
  const [chapter, setChapter] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [pending, setPending] = React.useState(false);

  function reset() {
    setTitle("");
    setType("NOTES");
    setSubjectId("");
    setChapter("");
    setFile(null);
  }

  async function handleSubmit() {
    if (!title || !subjectId) {
      toast.error("Title and subject are required.");
      return;
    }
    if (!file) {
      toast.error("Choose a PDF or image file to upload.");
      return;
    }
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("title", title);
      formData.set("type", type);
      formData.set("academicLevelId", levelId);
      formData.set("subjectId", subjectId);
      if (chapter) formData.set("chapter", chapter);
      formData.set("file", file);
      const result = await createStudyMaterialAction(formData, levelId);
      if (result && "error" in result && result.error) {
        toast.error(result.error);
      } else {
        toast.success("Material uploaded");
        setOpen(false);
        reset();
      }
    } catch {
      toast.error("Could not upload the material.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Upload Material
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Study Material</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Type *</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Subject *</Label>
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
          </div>
          <div className="space-y-1.5">
            <Label>Chapter</Label>
            <Input value={chapter} onChange={(e) => setChapter(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>File * (PDF or image, max 10MB)</Label>
            <Input type="file" accept=".pdf,image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <p className="text-xs text-muted-foreground">
              Uploaded here (not linked) so students can only view it in the portal — Word documents can&apos;t be shown view-only in a browser, so they aren&apos;t accepted here.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? "Uploading…" : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteButton({ id, levelId }: { id: string; levelId: string }) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await deleteStudyMaterialAction(id, levelId);
      toast.success("Removed");
      setOpen(false);
    } catch {
      toast.error("Could not remove material.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(true)}>
        <X className="h-3.5 w-3.5" />
      </Button>
      <ConfirmDialog open={open} onOpenChange={setOpen} title="Remove this study material?" destructive loading={pending} onConfirm={handleConfirm} />
    </>
  );
}
