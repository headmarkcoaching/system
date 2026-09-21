"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startTestAttemptAction } from "@/app/(dashboard)/tests/actions";

export function StartTestButton({ testId }: { testId: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleStart() {
    setPending(true);
    try {
      await startTestAttemptAction(testId);
      router.refresh();
    } catch {
      toast.error("Could not start the test. Please try again.");
      setPending(false);
    }
  }

  return (
    <Button onClick={handleStart} disabled={pending} size="lg">
      {pending ? "Starting…" : "Start Test"}
    </Button>
  );
}
