import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CtaLinkProps {
  href: string;
  children: React.ReactNode;
  size?: "default" | "lg";
  icon?: boolean;
  className?: string;
  target?: string;
  rel?: string;
}

/** The one, unmistakable action color on the marketing site — reserved for calls to action only,
 * so it never blends into the blue brand chrome around it. Not built on the shared dashboard
 * `Button` (that component's variants are relied on across the whole internal app); this is
 * purpose-built for a public page that needs its CTA to be the loudest thing on screen. */
export function PrimaryCta({ href, children, size = "default", icon = true, className, target, rel }: CtaLinkProps) {
  return (
    <Link
      href={href}
      target={target}
      rel={rel}
      className={cn(
        "group inline-flex items-center justify-center gap-2 rounded-full bg-cta font-semibold text-cta-foreground shadow-[0_8px_24px_-6px_hsl(var(--cta)/0.55)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-cta-hover hover:shadow-[0_12px_28px_-6px_hsl(var(--cta)/0.65)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta focus-visible:ring-offset-2",
        size === "lg" ? "px-8 py-4 text-base sm:px-10 sm:py-5 sm:text-lg" : "px-6 py-3.5 text-sm sm:text-base",
        className
      )}
    >
      {children}
      {icon && (
        <ArrowRight
          aria-hidden="true"
          className={cn("shrink-0 transition-transform group-hover:translate-x-1", size === "lg" ? "h-5 w-5" : "h-4 w-4")}
        />
      )}
    </Link>
  );
}

/** Secondary action — a clear, real button, just deliberately quieter than PrimaryCta so the
 * page keeps one obvious next step. */
export function SecondaryCta({ href, children, size = "default", className, target, rel }: CtaLinkProps) {
  return (
    <Link
      href={href}
      target={target}
      rel={rel}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full border-2 border-primary/25 bg-card font-semibold text-primary transition-all duration-200 hover:border-primary/50 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        size === "lg" ? "px-8 py-4 text-base sm:px-10 sm:py-5 sm:text-lg" : "px-6 py-3.5 text-sm sm:text-base",
        className
      )}
    >
      {children}
    </Link>
  );
}
