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
import { startThreadAction } from "@/app/(dashboard)/messages/actions";

export interface MessageTarget {
  studentId: string;
  studentName: string;
  teachers: { teacherId: string; name: string; subjects: string[] }[];
}

export function NewMessageForm({ targets }: { targets: MessageTarget[] }) {
  const router = useRouter();
  const [studentId, setStudentId] = React.useState(targets[0]?.studentId ?? "");
  const [teacherId, setTeacherId] = React.useState("");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const target = targets.find((t) => t.studentId === studentId) ?? targets[0];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const result = await startThreadAction(new FormData(e.currentTarget));
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Message sent");
      router.push(`/messages/${result.threadId}`);
    } catch {
      toast.error("Could not send your message. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {targets.length > 1 ? (
        <div className="space-y-1.5">
          <Label htmlFor="studentId">About which child? *</Label>
          <Select
            name="studentId"
            value={studentId}
            onValueChange={(v) => {
              setStudentId(v);
              setTeacherId("");
            }}
          >
            <SelectTrigger id="studentId">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {targets.map((t) => (
                <SelectItem key={t.studentId} value={t.studentId}>
                  {t.studentName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <input type="hidden" name="studentId" value={studentId} />
      )}

      <div className="space-y-1.5">
        <Label htmlFor="teacherId">Teacher *</Label>
        <Select name="teacherId" value={teacherId} onValueChange={setTeacherId}>
          <SelectTrigger id="teacherId">
            <SelectValue placeholder="Choose a teacher" />
          </SelectTrigger>
          <SelectContent>
            {target.teachers.map((t) => (
              <SelectItem key={t.teacherId} value={t.teacherId}>
                {t.name}
                {t.subjects.length > 0 ? ` · ${t.subjects.join(", ")}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="subject">Subject *</Label>
        <Input id="subject" name="subject" required minLength={3} maxLength={120} placeholder="For example: Ahmed's recent test results" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="body">Message *</Label>
        <Textarea id="body" name="body" required minLength={2} maxLength={2000} rows={6} placeholder="Write your message to the teacher." />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="file" className="flex cursor-pointer items-center gap-1.5 text-sm font-medium">
          <Paperclip className="h-4 w-4" aria-hidden="true" /> {fileName ?? "Attach a photo or file (optional)"}
        </Label>
        <input id="file" name="file" type="file" accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)} />
      </div>

      <p className="text-xs text-muted-foreground">The teacher and the academy office can read this conversation.</p>

      <Button type="submit" disabled={pending || !teacherId} className="w-full sm:w-auto">
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
