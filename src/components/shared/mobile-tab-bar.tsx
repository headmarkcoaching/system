"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav-config";
import { ICON_MAP } from "./icon-map";

// Screens where a student is in the middle of answering questions. The bar is hidden there so a
// stray tap near the bottom can't walk away from a timed paper, and so the question gets the room.
// ("start" and "subject" are setup and list pages, which keep the bar.)
export function isFocusedPage(pathname: string) {
  return /^\/student\/practice\/(?!start(\/|$))[^/]+$/.test(pathname) || /^\/student\/tests\/(?!subject(\/|$))[^/]+$/.test(pathname);
}

export function MobileTabBar({ tabs, onMore }: { tabs: NavItem[]; onMore: () => void }) {
  const pathname = usePathname();
  if (tabs.length === 0 || isFocusedPage(pathname)) return null;

  const homeHrefs = new Set(tabs.map((t) => t.href).filter((h) => h.split("/").length === 2));

  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/85 md:hidden">
      <ul className="mx-auto grid max-w-lg" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
        {tabs.map((tab) => {
          const active = homeHrefs.has(tab.href) ? pathname === tab.href : pathname.startsWith(tab.href);
          const Icon = ICON_MAP[tab.icon];
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium leading-none transition-colors active:bg-muted/60",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.75 : 2.25} />
                <span className="truncate">{tab.label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={onMore}
            className="flex min-h-14 w-full flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium leading-none text-muted-foreground transition-colors active:bg-muted/60"
          >
            <Menu className="h-5 w-5" strokeWidth={2.25} />
            <span>More</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
