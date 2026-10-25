"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SubjectOption {
  id: string;
  name: string;
}

/**
 * "Which subject do you want to try?" — one tick-box chip per subject taught in the chosen class. In
 * 1st/2nd Year the chosen group (Pre-Engineering, Pre-Medical, ICS) narrows the list to the subjects its
 * batches teach. The ticked ids are posted as repeated `subjectIds` form fields.
 */
export function SubjectPicker({
  subjects,
  subjectsByClass,
  levelId,
  groupId,
  name = "subjectIds",
}: {
  subjects: SubjectOption[];
  subjectsByClass: Record<string, string[]>;
  levelId?: string;
  groupId?: string;
  name?: string;
}) {
  // Ticks are kept in state (not left to the browser) so they survive React emptying the form after a refused submit.
  const [picked, setPicked] = React.useState<Set<string>>(new Set());
  const allowed = levelId ? (groupId && subjectsByClass[`${levelId}:${groupId}`]) || subjectsByClass[levelId] || [] : [];
  const visible = subjects.filter((s) => allowed.includes(s.id));

  // A subject that is no longer on offer (the class or stream changed) quietly drops out of the selection.
  const visibleIds = visible.map((v) => v.id).join(",");
  React.useEffect(() => {
    setPicked((prev) => {
      const keep = new Set([...prev].filter((id) => visibleIds.split(",").includes(id)));
      return keep.size === prev.size ? prev : keep;
    });
  }, [visibleIds]);

  if (!levelId) {
    return <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">Choose the class first, then pick the subject(s) you want to try.</p>;
  }
  if (visible.length === 0) {
    return <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">No subjects are listed for this class yet. Our team will ask you which one you want.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Subjects">
      {visible.map((s) => (
        <label
          key={`${levelId}:${groupId ?? ""}:${s.id}`}
          className={cn(
            "inline-flex min-h-[44px] cursor-pointer items-center rounded-full border border-border bg-background px-4 text-sm font-medium transition-colors",
            "hover:border-primary/50 has-[:checked]:border-primary has-[:checked]:bg-primary has-[:checked]:text-primary-foreground",
            "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2"
          )}
        >
          <input
            type="checkbox"
            name={name}
            value={s.id}
            checked={picked.has(s.id)}
            onChange={(e) =>
              setPicked((prev) => {
                const next = new Set(prev);
                if (e.target.checked) next.add(s.id);
                else next.delete(s.id);
                return next;
              })
            }
            className="sr-only"
          />
          {s.name}
        </label>
      ))}
    </div>
  );
}
