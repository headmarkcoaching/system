import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <div className={cn("max-w-xl", align === "center" ? "mx-auto text-center" : "text-left", className)}>
      <p className="text-xs font-bold uppercase tracking-wide text-primary">{eyebrow}</p>
      <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-balance">{title}</h2>
      {description && <p className="mt-3 leading-relaxed text-muted-foreground">{description}</p>}
    </div>
  );
}
