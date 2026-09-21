import { Plus } from "lucide-react";

export interface FaqItem {
  q: string;
  a: string;
}

export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
      {items.map((item) => (
        <details key={item.q} className="group p-5 sm:p-6">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-md font-display text-base font-bold outline-none [&::-webkit-details-marker]:hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            <span>{item.q}</span>
            <Plus
              aria-hidden="true"
              className="mt-0.5 h-5 w-5 shrink-0 text-primary transition-transform duration-200 group-open:rotate-45"
            />
          </summary>
          <p className="mt-3 leading-relaxed text-muted-foreground">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
