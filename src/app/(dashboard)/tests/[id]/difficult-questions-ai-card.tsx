"use client";

import * as React from "react";
import { toast } from "sonner";
import { Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { explainDifficultQuestionsAction } from "@/app/(dashboard)/tests/actions";

export function DifficultQuestionsAICard({ testId, initialExplanation }: { testId: string; initialExplanation: string | null }) {
  const [explanation, setExplanation] = React.useState(initialExplanation);
  const [pending, setPending] = React.useState(false);

  async function handleGenerate() {
    setPending(true);
    try {
      const text = await explainDifficultQuestionsAction(testId);
      setExplanation(text);
      toast.success("Explanation generated");
    } catch {
      toast.error("Couldn't generate an explanation.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" /> AI: Why These Were Difficult
        </CardTitle>
        <Button variant="outline" size="sm" onClick={handleGenerate} disabled={pending}>
          <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} /> {explanation ? "Regenerate" : "Generate"}
        </Button>
      </CardHeader>
      <CardContent>
        {!explanation ? (
          <EmptyState title="No explanation generated yet" className="py-6" />
        ) : (
          <p className="whitespace-pre-wrap text-sm">{explanation}</p>
        )}
      </CardContent>
    </Card>
  );
}
