"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavSection } from "@/lib/nav-config";
import Image from "next/image";
import { ICON_MAP } from "./icon-map";

export function SidebarNav({ sections, onNavigate }: { sections: NavSection[]; onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-border px-5">
        <Image
          src="/brand/head-mark-coaching-logo.png"
          alt="Head Mark Coaching"
          width={1564}
          height={1066}
          className="h-12 w-auto"
          priority
        />
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {sections.map((section, idx) => (
          <div key={section.title ?? idx}>
            {section.title && <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{section.title}</p>}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/admin" && item.href !== "/teacher" && item.href !== "/student" && item.href !== "/parent" && pathname.startsWith(item.href));
                const Icon = ICON_MAP[item.icon];
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                        active ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/80 hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
