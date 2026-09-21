import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ListChecks } from "lucide-react";
import type { NextAction } from "@/lib/services/next-actions";

const URGENCY_TONE: Record<NextAction["urgency"], "destructive" | "warning" | "secondary"> = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
};

export function NextActionsCard({ title = "Next Actions", actions }: { title?: string; actions: NextAction[] }) {
  if (actions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <ListChecks className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {actions.map((a, i) => {
            const content = (
              <div className="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Badge variant={URGENCY_TONE[a.urgency]} className="text-xs">
                    {a.urgency}
                  </Badge>
                  {a.href && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
              </div>
            );
            return <li key={i}>{a.href ? <Link href={a.href}>{content}</Link> : content}</li>;
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
