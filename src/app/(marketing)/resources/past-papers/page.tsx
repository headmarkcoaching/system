import Link from "next/link";
import type { Metadata } from "next";
import { Clock, FileText, Target } from "lucide-react";
import { db } from "@/lib/db";
import { DotGrid } from "@/components/marketing/decorative";
import { PrimaryCta, SecondaryCta } from "@/components/marketing/cta-link";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Past Papers",
  description: "Board past papers and model papers by class and subject, and how to use them to prepare for your exams.",
};

export const dynamic = "force-dynamic";

const SESSION_LABEL: Record<string, string> = { ANNUAL: "Annual", SUPPLEMENTARY: "Supplementary", MODEL: "Model paper" };

const HOW_TO_USE = [
  "Attempt the paper in one sitting, in the real time limit, without your notes.",
  "Mark it honestly afterwards and list every question you lost marks on.",
  "Fix those topics first, then try an older paper to check the improvement.",
  "Look for questions that repeat from year to year. They show what the Board likes to ask.",
];

export default async function PastPapersPage(props: { searchParams: Promise<{ level?: string }> }) {
  const { level } = await props.searchParams;
  const papers = await db.pastPaper.findMany({
    where: { isPublished: true },
    orderBy: [{ year: "desc" }, { title: "asc" }],
    select: {
      id: true,
      title: true,
      year: true,
      session: true,
      totalMarks: true,
      durationMinutes: true,
      subject: { select: { name: true } },
      academicLevel: { select: { id: true, name: true, sortOrder: true } },
      board: { select: { name: true } },
    },
  });

  const levels = [...new Map(papers.map((p) => [p.academicLevel.id, p.academicLevel])).values()].sort((a, b) => a.sortOrder - b.sortOrder);
  const shown = level ? papers.filter((p) => p.academicLevel.id === level) : papers;

  // class -> subject -> papers
  const grouped = new Map<string, { levelName: string; sortOrder: number; subjects: Map<string, typeof papers> }>();
  for (const p of shown) {
    const g = grouped.get(p.academicLevel.id) ?? { levelName: p.academicLevel.name, sortOrder: p.academicLevel.sortOrder, subjects: new Map() };
    g.subjects.set(p.subject.name, [...(g.subjects.get(p.subject.name) ?? []), p]);
    grouped.set(p.academicLevel.id, g);
  }
  const groups = [...grouped.values()].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-secondary/30 py-14 sm:py-16">
        <DotGrid className="h-full text-primary" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Past papers</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">Practise with real exam papers</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Board past papers and model papers, by class and subject. Students of Head Mark Coaching can attempt each one online, get it marked and see where they lost marks.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {levels.length > 1 && (
          <div className="mb-8 flex flex-wrap justify-center gap-2" role="group" aria-label="Filter by class">
            <Chip href="/resources/past-papers" active={!level}>
              All classes
            </Chip>
            {levels.map((l) => (
              <Chip key={l.id} href={`/resources/past-papers?level=${l.id}`} active={level === l.id}>
                {l.name}
              </Chip>
            ))}
          </div>
        )}

        {groups.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
            Past papers are being added. Check back soon.
          </p>
        ) : (
          <div className="space-y-10">
            {groups.map((g) => (
              <section key={g.levelName}>
                <h2 className="font-display text-2xl font-bold">{g.levelName}</h2>
                <div className="mt-4 space-y-6">
                  {[...g.subjects].map(([subject, list]) => (
                    <div key={subject}>
                      <h3 className="text-sm font-bold uppercase tracking-wide text-primary">{subject}</h3>
                      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                        {list.map((p) => (
                          <li key={p.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
                            <div className="flex items-start gap-3">
                              <FileText aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                              <div>
                                <p className="font-semibold leading-snug">{p.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {p.year} · {SESSION_LABEL[p.session] ?? p.session}
                                  {p.board ? ` · ${p.board.name}` : ""}
                                </p>
                              </div>
                            </div>
                            <p className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Target aria-hidden="true" className="h-3.5 w-3.5" /> {p.totalMarks} marks
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <Clock aria-hidden="true" className="h-3.5 w-3.5" /> {p.durationMinutes} min
                              </span>
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl font-bold">How to use a past paper</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground marker:font-semibold marker:text-primary">
              {HOW_TO_USE.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ol>
            <Link href="/resources/study-material" className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
              More exam tips and tricks
            </Link>
          </div>
          <div className="flex flex-col justify-center rounded-2xl border border-cta/30 bg-cta-wash p-6">
            <h2 className="font-display text-xl font-bold">Attempt these papers online</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Enrolled students open each paper in their portal, answer it, and see their marks and mistakes straight away. Try it free with a trial class.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <PrimaryCta href="/enroll">Book Free Trial</PrimaryCta>
              <SecondaryCta href="/login" icon={false}>
                Student Login
              </SecondaryCta>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </Link>
  );
}
