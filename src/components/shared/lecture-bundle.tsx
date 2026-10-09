import Link from "next/link";
import { FileText, PenLine, ClipboardCheck, X } from "lucide-react";
import type { LectureBundle } from "@/lib/lecture-bundle";

function BundleLink({ href, icon: Icon, label, count }: { href: string; icon: typeof FileText; label: string; count: number }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      {label}
      <span className="rounded-full bg-muted px-1.5 text-[10px] tabular-nums text-muted-foreground">{count}</span>
    </Link>
  );
}

/** Notes, practice and tests that belong to one lecture's chapter, linked into the same
 * subject pages the student already uses, pre-filtered to that chapter. */
export function LectureBundleLinks({ subjectId, bundle }: { subjectId: string; bundle: LectureBundle }) {
  const q = `?chapter=${encodeURIComponent(bundle.chapter)}`;
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-border pt-2">
      <span className="text-xs text-muted-foreground">
        Chapter: <span className="font-medium text-foreground">{bundle.chapter}</span>
      </span>
      {bundle.notes > 0 && <BundleLink href={`/student/study-material/subject/${subjectId}${q}`} icon={FileText} label="Notes" count={bundle.notes} />}
      {bundle.practice > 0 && <BundleLink href={`/student/homework/subject/${subjectId}${q}`} icon={PenLine} label="Practice" count={bundle.practice} />}
      {bundle.tests > 0 && <BundleLink href={`/student/tests/subject/${subjectId}${q}`} icon={ClipboardCheck} label="Mock Test" count={bundle.tests} />}
    </div>
  );
}

/** Shown on a subject page that was opened from a lecture, so the narrowed list is never a surprise. */
export function ChapterFilterNotice({ chapter, clearHref }: { chapter: string; clearHref: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/25 bg-primary/[0.06] px-3 py-2 text-sm">
      <span>
        Showing chapter <span className="font-semibold">{chapter}</span>
      </span>
      <Link href={clearHref} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
        <X className="h-3 w-3" aria-hidden="true" /> Show all
      </Link>
    </div>
  );
}
