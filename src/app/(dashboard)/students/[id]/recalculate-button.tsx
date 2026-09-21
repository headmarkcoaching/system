"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { recalculatePerformanceAction } from "./performance-actions";

export function RecalculateButton({ studentId, batchId }: { studentId: string; batchId: string | null }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleClick() {
    setPending(true);
    try {
      await recalculatePerformanceAction(studentId, batchId);
      toast.success("Performance recalculated");
      router.refresh();
    } catch {
      toast.error("Could not recalculate performance.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} disabled={pending}>
      <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} /> Recalculate
    </Button>
  );
}
