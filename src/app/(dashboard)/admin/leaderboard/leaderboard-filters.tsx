"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function LeaderboardFilters({
  scope,
  scopeId,
  batches,
  levels,
}: {
  scope: string;
  scopeId?: string;
  batches: { id: string; name: string }[];
  levels: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  function updateParams(next: { scope?: string; scopeId?: string }) {
    const params = new URLSearchParams();
    const nextScope = next.scope ?? scope;
    params.set("scope", nextScope);
    const nextScopeId = "scopeId" in next ? next.scopeId : scopeId;
    if (nextScopeId && nextScope !== "month") params.set("scopeId", nextScopeId);
    router.push(`${pathname}?${params.toString()}`);
  }

  const scopeOptions = batches.length > 0 || levels.length > 0
    ? [{ value: "month", label: "This Month (All)" }, { value: "batch", label: "By Batch" }, { value: "level", label: "By Level" }]
    : [{ value: "month", label: "This Month (All)" }];

  return (
    <div className="flex flex-wrap gap-2">
      <Select value={scope} onValueChange={(v) => updateParams({ scope: v, scopeId: v === "batch" ? batches[0]?.id : v === "level" ? levels[0]?.id : undefined })}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {scopeOptions.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {scope === "batch" && (
        <Select value={scopeId} onValueChange={(v) => updateParams({ scopeId: v })}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select batch" />
          </SelectTrigger>
          <SelectContent>
            {batches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {scope === "level" && (
        <Select value={scopeId} onValueChange={(v) => updateParams({ scopeId: v })}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select level" />
          </SelectTrigger>
          <SelectContent>
            {levels.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
