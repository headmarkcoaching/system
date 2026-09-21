import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import { initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export interface ChildSummary {
  studentId: string;
  fullName: string;
  levelName: string;
  attendanceRate: number;
  performanceCategory: string | null;
}

/** "Parent can see each child's [snapshot] at a glance" — a compact strip complementing the
 * existing ChildSwitcher dropdown (kept as-is for narrow screens / many children), rather than
 * replacing it, since a parent with only one child sees nothing extra here. */
export function AllChildrenStrip({ childrenSummaries, selectedId }: { childrenSummaries: ChildSummary[]; selectedId: string }) {
  if (childrenSummaries.length <= 1) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {childrenSummaries.map((c) => (
        <Link
          key={c.studentId}
          href={`/parent?child=${c.studentId}`}
          className={`flex shrink-0 items-center gap-3 rounded-lg border p-3 transition-colors ${
            c.studentId === selectedId ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
          }`}
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs">{initials(c.fullName)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{c.fullName}</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{c.attendanceRate}% att.</span>
              {c.performanceCategory && <StatusBadge status={c.performanceCategory} />}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
