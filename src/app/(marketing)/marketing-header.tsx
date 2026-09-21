"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { PrimaryCta } from "@/components/marketing/cta-link";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home", href: "/home" },
  { label: "Programs", href: "/programs" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export function MarketingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/home" className="flex shrink-0 items-center" onClick={() => setOpen(false)}>
          <Image
            src="/brand/head-mark-coaching-logo.png"
            alt="Head Mark Coaching"
            width={1564}
            height={1066}
            className="h-14 w-auto"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-semibold transition-colors hover:text-primary",
                pathname === link.href ? "text-primary" : "text-foreground/70"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-5 md:flex">
          <Link href="/login" className="text-sm font-semibold text-foreground/70 hover:text-primary">
            Login
          </Link>
          <PrimaryCta href="/enroll">Book Free Trial</PrimaryCta>
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X aria-hidden="true" className="h-6 w-6" /> : <Menu aria-hidden="true" className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-semibold",
                  pathname === link.href ? "bg-secondary text-primary" : "text-foreground/70 hover:bg-secondary/60"
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground/70 hover:bg-secondary/60"
            >
              Login
            </Link>
          </nav>
          <PrimaryCta href="/enroll" className="mt-4 w-full" size="lg">
            Book Free Trial
          </PrimaryCta>
        </div>
      )}
    </header>
  );
}
