"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateAIUsageConfigAction } from "./actions";

export function ConfigForm({ dailyTokenSoftCap, costPerThousandTokensUsd }: { dailyTokenSoftCap: number | null; costPerThousandTokensUsd: number }) {
  const [cap, setCap] = React.useState(dailyTokenSoftCap?.toString() ?? "");
  const [cost, setCost] = React.useState(costPerThousandTokensUsd.toString());
  const [pending, setPending] = React.useState(false);

  async function handleSave() {
    setPending(true);
    try {
      await updateAIUsageConfigAction({ dailyTokenSoftCap: cap ? Number(cap) : null, costPerThousandTokensUsd: Number(cost) || 0 });
      toast.success("Saved");
    } catch {
      toast.error("Could not save.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Daily Token Soft Cap (optional)</Label>
        <Input value={cap} onChange={(e) => setCap(e.target.value)} type="number" placeholder="e.g. 100000" className="w-48" />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Cost per 1,000 Tokens (USD)</Label>
        <Input value={cost} onChange={(e) => setCost(e.target.value)} type="number" step="0.001" className="w-40" />
      </div>
      <Button size="sm" onClick={handleSave} disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
