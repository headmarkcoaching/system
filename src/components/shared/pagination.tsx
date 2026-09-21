import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  basePath,
  searchParams,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  basePath: string;
  searchParams?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const buildHref = (targetPage: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams ?? {}).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set("page", String(targetPage));
    return `${basePath}?${params.toString()}`;
  };

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-1 py-4 sm:flex-row">
      <p className="text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{start}–{end}</span> of{" "}
        <span className="font-medium text-foreground">{totalItems}</span>
      </p>
      <div className="flex items-center gap-1">
        <PagerLink href={buildHref(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous</span>
        </PagerLink>
        <span className="px-2 text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <PagerLink href={buildHref(page + 1)} disabled={page >= totalPages}>
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next</span>
        </PagerLink>
      </div>
    </div>
  );
}

function PagerLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  const className = cn(
    "inline-flex h-9 w-9 items-center justify-center rounded-md border border-input text-sm transition-colors",
    disabled ? "pointer-events-none opacity-40" : "hover:bg-accent"
  );
  if (disabled) {
    return <span className={className}>{children}</span>;
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
