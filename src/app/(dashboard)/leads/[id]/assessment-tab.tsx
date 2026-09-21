"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { recordAssessmentAction } from "../actions";

interface AssessmentRecord {
  id: string;
  overallScore: number | null;
  weakSubjects: string[];
  recommendedProgram: string | null;
  documentFileId: string | null;
  conductedAt: Date;
}

export function AssessmentTab({ leadId, assessments, canManage }: { leadId: string; assessments: AssessmentRecord[]; canManage: boolean }) {
  const [overallScore, setOverallScore] = React.useState("");
  const [weakSubjectsText, setWeakSubjectsText] = React.useState("");
  const [recommendedProgram, setRecommendedProgram] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Attach the assessment document (photo, scanned paper, or PDF).");
      return;
    }
    setPending(true);
    try {
      const formData = new FormData();
      formData.set("overallScore", overallScore);
      formData.set("weakSubjectsText", weakSubjectsText);
      formData.set("recommendedProgram", recommendedProgram);
      formData.set("file", file);
      const result = await recordAssessmentAction(leadId, formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Assessment recorded");
        setOverallScore("");
        setWeakSubjectsText("");
        setRecommendedProgram("");
        setFile(null);
      }
    } catch {
      toast.error("Could not record assessment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border p-4">
          <h3 className="font-semibold">Record Diagnostic Assessment</h3>
          <p className="text-xs text-muted-foreground">
            The assessment itself happens outside the app — a call, an in-person session, or a paper test. Upload the
            result here as evidence; the score and notes below are optional context alongside it.
          </p>
          <div className="space-y-1.5">
            <Label>Assessment Document *</Label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx,image/png,image/jpeg,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">A photo/scan of the test paper, or a PDF report. Max 10MB.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Overall Score (0-100)</Label>
              <Input type="number" min={0} max={100} value={overallScore} onChange={(e) => setOverallScore(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Weak Subjects (comma separated)</Label>
              <Input value={weakSubjectsText} onChange={(e) => setWeakSubjectsText(e.target.value)} placeholder="Physics, Mathematics" />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label>Recommended Program</Label>
              <Input value={recommendedProgram} onChange={(e) => setRecommendedProgram(e.target.value)} />
            </div>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Record Assessment"}
          </Button>
        </form>
      )}

      {assessments.length === 0 ? (
        <EmptyState title="No assessment recorded yet" />
      ) : (
        <ul className="space-y-2">
          {assessments.map((a) => (
            <li key={a.id} className="space-y-2 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{formatDate(a.conductedAt)}</span>
                {a.overallScore != null && <Badge variant={a.overallScore >= 50 ? "success" : "warning"}>{a.overallScore}/100</Badge>}
              </div>
              {a.weakSubjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {a.weakSubjects.map((s) => (
                    <Badge key={s} variant="secondary">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
              {a.recommendedProgram && <p className="text-sm text-muted-foreground">Recommended: {a.recommendedProgram}</p>}
              {a.documentFileId && (
                <a
                  href={`/api/files/${a.documentFileId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" /> View Assessment Document
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
