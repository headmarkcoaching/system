"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export const RESOURCE_LINKS = [
  { label: "Blog", href: "/resources/blog", hint: "Advice for students and parents" },
  { label: "Past Papers", href: "/resources/past-papers", hint: "Board and model papers" },
  { label: "Study Material", href: "/resources/study-material", hint: "Exam tips and tricks" },
];

/** The "Resources" item of the top menu, with a dropdown. Opens on hover or tap, closes on Escape or a click elsewhere. */
export function ResourcesMenu() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const active = pathname.startsWith("/resources");

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  React.useEffect(() => setOpen(false), [pathname]);

  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1 text-sm font-semibold transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          active ? "text-primary" : "text-foreground/70"
        )}
      >
        Resources
        <ChevronDown aria-hidden="true" className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-1/2 top-full z-40 w-64 -translate-x-1/2 pt-3">
          <ul role="menu" className="overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-lg">
            {RESOURCE_LINKS.map((l) => (
              <li key={l.href} role="none">
                <Link
                  role="menuitem"
                  href={l.href}
                  className={cn(
                    "block rounded-lg px-3 py-2.5 hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none",
                    pathname.startsWith(l.href) && "bg-secondary"
                  )}
                >
                  <span className="block text-sm font-semibold text-foreground">{l.label}</span>
                  <span className="block text-xs text-muted-foreground">{l.hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
