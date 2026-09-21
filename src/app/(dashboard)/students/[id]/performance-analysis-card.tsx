"use client";

import * as React from "react";
import { toast } from "sonner";
import { RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { generatePerformanceAnalysisAction } from "./performance-actions";

export function PerformanceAnalysisCard({
  studentId,
  canGenerate,
  initialAnalysis,
}: {
  studentId: string;
  canGenerate: boolean;
  initialAnalysis: { analysis: string; generatedAt: Date } | null;
}) {
  const [analysis, setAnalysis] = React.useState(initialAnalysis);
  const [pending, setPending] = React.useState(false);

  async function handleGenerate(force: boolean) {
    setPending(true);
    try {
      const result = await generatePerformanceAnalysisAction(studentId, force);
      setAnalysis({ analysis: result.analysis, generatedAt: result.generatedAt });
      toast.success(force ? "Analysis regenerated" : "Analysis generated");
    } catch {
      toast.error("Couldn't generate an analysis. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" /> AI Insights
        </CardTitle>
        {canGenerate && (
          <Button variant="outline" size="sm" onClick={() => handleGenerate(!!analysis)} disabled={pending}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} /> {analysis ? "Regenerate" : "Generate"}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!analysis ? (
          <EmptyState title="No analysis generated yet" className="py-6" />
        ) : (
          <div className="space-y-2">
            <p className="whitespace-pre-wrap text-sm">{analysis.analysis}</p>
            <p className="text-xs text-muted-foreground">Generated {formatDate(analysis.generatedAt)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
