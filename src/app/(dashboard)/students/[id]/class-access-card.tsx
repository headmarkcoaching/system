"use client";

import * as React from "react";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { setClassAccessOverrideAction } from "./profile-actions";

/**
 * Staff view of whether a student can join live classes, and a way to allow an exception. The rule
 * itself lives on the server (class-access.ts); this only shows the result and records the exception.
 */
export function ClassAccessCard({
  studentId,
  allowed,
  viaOverride,
  overrideUntil,
  message,
  graceDays,
}: {
  studentId: string;
  allowed: boolean;
  viaOverride: boolean;
  overrideUntil: Date | null;
  message: string | null;
  graceDays: number;
}) {
  const [pending, setPending] = React.useState(false);

  async function apply(days: number) {
    setPending(true);
    try {
      const result = await setClassAccessOverrideAction(studentId, days);
      if (result?.error) toast.error(result.error);
      else toast.success(days === 0 ? "Exception removed" : `Allowed to join classes for ${days} day${days === 1 ? "" : "s"}`);
    } catch {
      toast.error("Couldn't save that. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        {allowed ? <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />}
        <div className="text-sm">
          <p className="font-semibold">{allowed ? (viaOverride ? "Allowed by staff exception" : "Can join live classes") : "Blocked from live classes"}</p>
          <p className="text-muted-foreground">
            {allowed
              ? viaOverride && overrideUntil
                ? `Exception lasts until ${formatDate(overrideUntil)}.`
                : `Fees are in good standing (a ${graceDays}-day grace period applies after a due date).`
              : message}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {viaOverride ? (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => apply(0)}>
            Remove exception
          </Button>
        ) : (
          !allowed &&
          [1, 3, 7].map((d) => (
            <Button key={d} size="sm" variant="outline" disabled={pending} onClick={() => apply(d)}>
              Allow {d} day{d === 1 ? "" : "s"}
            </Button>
          ))
        )}
      </div>
    </div>
  );
}
