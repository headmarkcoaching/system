"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Collapsed-by-default wrapper for secondary/detailed content — used by the Parent dashboard
 * to keep "simple summary first, detailed analytics optional" (do not overwhelm with detail up
 * front) without needing a second page or route. */
export function DetailsToggle({ label, defaultOpen = false, children }: { label: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" onClick={() => setOpen((o) => !o)} className="w-full justify-between sm:w-auto">
        {label}
        <ChevronDown className={`ml-1.5 h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>
      {open && <div className="space-y-6">{children}</div>}
    </div>
  );
}
