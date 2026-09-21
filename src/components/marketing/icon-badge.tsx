import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** A stamped seal, not another circle-icon-in-a-badge — a slight counter-rotation and a hard
 * double-weight border read as an official mark impressed on the page, tying every feature
 * callout back to the brand's actual subject (marks, records, results) instead of borrowing
 * the generic rounded-icon-badge every SaaS template reaches for. */
export function IconBadge({
  icon: Icon,
  size = "default",
  className,
}: {
  icon: LucideIcon;
  size?: "default" | "lg";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "stamp-badge flex shrink-0 -rotate-2 items-center justify-center rounded-lg border-[1.5px] border-primary/30 bg-primary/[0.06] text-primary",
        size === "lg" ? "h-16 w-16" : "h-12 w-12",
        className
      )}
    >
      <Icon aria-hidden="true" className={size === "lg" ? "h-8 w-8" : "h-6 w-6"} strokeWidth={1.75} />
    </div>
  );
}
