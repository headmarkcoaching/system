"use client";

import * as React from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { setBatchLeaderboardAction } from "@/app/(dashboard)/admin/batches/actions";

export function LeaderboardToggle({ batchId, initialEnabled }: { batchId: string; initialEnabled: boolean }) {
  const [enabled, setEnabled] = React.useState(initialEnabled);
  const [pending, setPending] = React.useState(false);

  async function handleChange(checked: boolean) {
    setEnabled(checked);
    setPending(true);
    try {
      await setBatchLeaderboardAction(batchId, checked);
      toast.success(checked ? "Leaderboard enabled for this batch" : "Leaderboard disabled for this batch");
    } catch {
      setEnabled(!checked);
      toast.error("Could not update leaderboard setting.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5">
      <Label htmlFor="leaderboard-toggle" className="text-sm">
        Leaderboard
      </Label>
      <Switch id="leaderboard-toggle" checked={enabled} onCheckedChange={handleChange} disabled={pending} />
    </div>
  );
}
