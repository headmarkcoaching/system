"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { retryZoomRecordingAction } from "./actions";

export function RetryRecordingButton({ jobId }: { jobId: string }) {
  const [pending, setPending] = React.useState(false);
  async function retry() {
    setPending(true);
    try {
      const res = await retryZoomRecordingAction(jobId);
      if (res.error) toast.error(res.error);
      else toast.success("Retry started. Refresh in a minute to see the result.");
    } catch {
      toast.error("Couldn't retry. Please try again.");
    } finally {
      setPending(false);
    }
  }
  return (
    <Button size="sm" variant="outline" onClick={retry} disabled={pending}>
      {pending ? "Retrying…" : "Retry"}
    </Button>
  );
}
