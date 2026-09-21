"use client";

import * as React from "react";
import { toast } from "sonner";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { suggestRevisionTopicsAction } from "./actions";

export function RevisionTopicsPanel({ students }: { students: { id: string; fullName: string; studentCode: string }[] }) {
  const [studentId, setStudentId] = React.useState("");
  const [result, setResult] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleGenerate() {
    if (!studentId) return;
    setPending(true);
    setResult(null);
    try {
      const text = await suggestRevisionTopicsAction(studentId);
      setResult(text);
    } catch {
      toast.error("Couldn't generate revision topics.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="h-4 w-4 text-primary" /> Suggest Revision Topics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {students.length === 0 ? (
          <EmptyState title="No students available" className="py-6" />
        ) : (
          <>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.fullName} ({s.studentCode})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" onClick={handleGenerate} disabled={!studentId || pending}>
              {pending ? "Generating…" : "Generate"}
            </Button>
          </>
        )}
        {result && <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-sm">{result}</p>}
      </CardContent>
    </Card>
  );
}
