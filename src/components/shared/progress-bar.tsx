import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  label,
  tone = "auto",
  className,
}: {
  value: number;
  label?: string;
  tone?: "auto" | "primary" | "success" | "warning" | "destructive";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const resolvedTone =
    tone === "auto" ? (clamped >= 85 ? "success" : clamped >= 60 ? "primary" : clamped >= 40 ? "warning" : "destructive") : tone;

  const barColor: Record<string, string> = {
    primary: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
  };

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span className="font-medium text-foreground">{Math.round(clamped)}%</span>
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-all", barColor[resolvedTone])} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
