import type { LucideIcon } from "lucide-react";

export interface Stat {
  icon: LucideIcon;
  value: string;
  label: string;
}

export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid grid-cols-2 divide-y divide-border rounded-2xl border border-border bg-card shadow-sm sm:grid-cols-4 sm:divide-x sm:divide-y-0">
      {stats.map((s) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="flex flex-col items-center gap-2 px-4 py-7 text-center sm:px-3">
            <Icon aria-hidden="true" className="h-5 w-5 text-primary" strokeWidth={1.75} />
            <p className="font-ledger text-3xl font-semibold tracking-tight tabular-nums text-primary sm:text-4xl">{s.value}</p>
            <p className="text-sm leading-snug text-muted-foreground">{s.label}</p>
          </div>
        );
      })}
    </div>
  );
}
