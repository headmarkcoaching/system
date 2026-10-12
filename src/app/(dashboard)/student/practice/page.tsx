import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Check, FileText, Layers, Target, Trophy } from "lucide-react";
import { auth } from "@/lib/auth";
import * as studentService from "@/lib/services/students";
import * as practiceService from "@/lib/services/practice";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatDate } from "@/lib/utils";
import type { ScopeBlock, MasteryLevel } from "@/lib/practice";

const LEVEL_LABEL: Record<MasteryLevel, { label: string; variant: "secondary" | "destructive" | "warning" | "success" }> = {
  NEW: { label: "Not started", variant: "secondary" },
  NEEDS_WORK: { label: "Needs work", variant: "destructive" },
  IMPROVING: { label: "Improving", variant: "warning" },
  STRONG: { label: "Strong", variant: "success" },
};

function startHref(subjectId: string, scope: string, target?: string) {
  return `/student/practice/start?subject=${subjectId}&scope=${scope}${target ? `&target=${target}` : ""}`;
}

export default async function PracticeHubPage(props: { searchParams: Promise<{ subject?: string }> }) {
  const searchParams = await props.searchParams;
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await studentService.getStudentByUserId(session.user.id);
  const subjects = student ? await practiceService.listPracticeSubjects(student.id) : [];
  const header = <PageHeader title="Practice and Exam Prep" description="Build a practice paper for any chapter, quarter, half or the full book, then work up to past papers." />;

  if (!student || subjects.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyState title="No subjects yet" description="Once you're in a batch, you can practise its subjects here." />
      </div>
    );
  }

  // Open on the first subject that actually has practice content rather than an empty one.
  const subject = subjects.find((s) => s.subjectId === searchParams.subject) ?? subjects.find((s) => s.hasContent) ?? subjects[0];
  const hub = await practiceService.getHubData(student.id, subject.subjectId);

  const tabs = (
    <nav aria-label="Subjects" className="flex flex-wrap gap-1.5">
      {subjects.map((s) => (
        <Link
          key={s.subjectId}
          href={`/student/practice?subject=${s.subjectId}`}
          aria-current={s.subjectId === subject.subjectId ? "page" : undefined}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            s.subjectId === subject.subjectId ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-accent"
          )}
        >
          {s.subjectName}
        </Link>
      ))}
    </nav>
  );

  if (hub.chapters.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        {tabs}
        <EmptyState title={`Practice isn't set up for ${subject.subjectName} yet`} description="Your teacher is still adding the chapters and questions for this subject." />
      </div>
    );
  }

  const blockCard = (block: ScopeBlock) => {
    const count = hub.questionsAvailableIn(block.chapterIds);
    const percents = block.chapterIds.map((id) => hub.mastery.get(id)?.percent).filter((p): p is number => p !== undefined && p !== null);
    const average = percents.length ? Math.round(percents.reduce((s, p) => s + p, 0) / percents.length) : null;
    const passed = hub.passedScopeKeys.has(block.key);
    return (
      <Card key={block.key} className="flex flex-col">
        <CardContent className="flex flex-1 flex-col gap-3 p-5 sm:p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-base font-bold leading-tight">{block.label}</p>
              <p className="text-xs text-muted-foreground">{block.detail}</p>
            </div>
            {passed && (
              <Badge variant="success" className="gap-1">
                <Check className="h-3 w-3" aria-hidden="true" /> Passed
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {count} question{count === 1 ? "" : "s"} available{average !== null ? ` · chapters average ${average}%` : ""}
          </p>
          <Button asChild size="sm" variant={passed ? "outline" : "default"} className="mt-auto" disabled={count === 0}>
            <Link href={startHref(subject.subjectId, block.scope, block.key)}>
              {passed ? "Try again" : "Start"} <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      {header}
      {tabs}

      {hub.recommendations.length > 0 && (
        <section aria-labelledby="next-step" className="space-y-3">
          <h2 id="next-step" className="font-display text-lg font-semibold">
            Your next step
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {hub.recommendations.map((r) => (
              <Link
                key={r.id}
                href={startHref(subject.subjectId, r.scope, r.target)}
                className="group flex items-start justify-between gap-3 rounded-xl border-2 border-primary/30 bg-primary/[0.05] p-4 transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div>
                  <p className="font-semibold">{r.title}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{r.detail}</p>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {hub.blocks.quarters.length > 0 && (
        <section aria-labelledby="by-quarter" className="space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 id="by-quarter" className="font-display text-lg font-semibold">
              Quarter of the book
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{hub.blocks.quarters.map(blockCard)}</div>
        </section>
      )}

      {(hub.blocks.halves.length > 0 || hub.blocks.full) && (
        <section aria-labelledby="by-half" className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 id="by-half" className="font-display text-lg font-semibold">
              Half book and full book
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {hub.blocks.halves.map(blockCard)}
            {hub.blocks.full && blockCard(hub.blocks.full)}
            <Card className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3 p-5 sm:p-5">
                <div>
                  <p className="font-display text-base font-bold leading-tight">Past papers</p>
                  <p className="text-xs text-muted-foreground">Solve real papers against the clock</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {hub.pastPaperCount} paper{hub.pastPaperCount === 1 ? "" : "s"} available
                </p>
                <Button asChild size="sm" variant="outline" className="mt-auto">
                  <Link href={`/student/practice/past-papers?subject=${subject.subjectId}`}>
                    <FileText className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Open
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      <section aria-labelledby="by-chapter" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 id="by-chapter" className="font-display text-lg font-semibold">
              Chapter by chapter
            </h2>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={startHref(subject.subjectId, "WEAK_AREAS")}>Practise my weak areas</Link>
          </Button>
        </div>
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
          {hub.chapters.map((c) => {
            const m = hub.mastery.get(c.id);
            const level = LEVEL_LABEL[m?.level ?? "NEW"];
            const available = hub.available.get(c.id) ?? 0;
            return (
              <li key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    <span className="mr-2 font-ledger text-sm text-muted-foreground">{String(c.number).padStart(2, "0")}</span>
                    {c.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {available} question{available === 1 ? "" : "s"} available
                    {m ? ` · ${m.attempted} answered${m.lastPracticedAt ? `, last on ${formatDate(m.lastPracticedAt)}` : ""}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 sm:w-72">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted" role="img" aria-label={m?.percent != null ? `${m.percent} percent` : "No practice yet"}>
                    <div
                      className={cn("h-full rounded-full", m?.level === "STRONG" ? "bg-success" : m?.level === "NEEDS_WORK" ? "bg-destructive" : "bg-primary")}
                      style={{ width: `${m?.percent ?? 0}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-ledger text-sm tabular-nums">{m?.percent != null ? `${m.percent}%` : "-"}</span>
                  <Badge variant={level.variant} className="w-24 justify-center">
                    {level.label}
                  </Badge>
                </div>
                <Button asChild size="sm" variant="outline" disabled={available === 0}>
                  <Link href={startHref(subject.subjectId, "CHAPTER", c.id)}>Practise</Link>
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      {hub.recent.length > 0 && (
        <section aria-labelledby="recent" className="space-y-3">
          <h2 id="recent" className="font-display text-lg font-semibold">
            Recent attempts
          </h2>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {hub.recent.map((s) => {
              const done = s.status === "SUBMITTED";
              const percent = done && s.totalMarks ? Math.round(((s.marksObtained ?? 0) / s.totalMarks) * 100) : null;
              return (
                <li key={s.id}>
                  <Link href={`/student/practice/${s.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.scopeLabel}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.mode === "EXAM" ? "Timed exam" : "Practice"} · {s.questionIds.length} questions · {formatDate(s.startedAt)}
                      </p>
                    </div>
                    {done ? (
                      <Badge variant={percent !== null && percent >= practiceService.PASS_PERCENT ? "success" : percent !== null && percent >= 40 ? "warning" : "destructive"}>
                        {s.marksObtained}/{s.totalMarks} · {percent}%
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Continue</Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
