import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  hint?: string;
  tone?: "default" | "success" | "warning" | "destructive";
  className?: string;
}) {
  const toneClasses: Record<string, string> = {
    default: "text-primary border-primary/30 bg-primary/[0.06]",
    success: "text-success border-success/30 bg-success/[0.06]",
    warning: "text-warning border-warning/30 bg-warning/[0.06]",
    destructive: "text-destructive border-destructive/30 bg-destructive/[0.06]",
  };

  return (
    <Card className={cn(className)}>
      <CardContent className="flex items-center justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium leading-snug text-muted-foreground sm:text-sm">{label}</p>
          <p className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">{value}</p>
          {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          // A stamped seal, not a plain colored circle — the same brand mark used for every
          // icon badge on the marketing site, so the dashboard and public site read as one
          // designed system instead of two.
          <div
            className={cn(
              "stamp-badge flex h-11 w-11 shrink-0 -rotate-2 items-center justify-center rounded-lg border-[1.5px]",
              toneClasses[tone]
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
