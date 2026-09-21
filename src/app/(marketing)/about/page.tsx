import { Eye, Users2, ShieldCheck, Building2, Sparkles, GraduationCap, ClipboardList, Video, Landmark, BookOpen } from "lucide-react";
import type { Metadata } from "next";
import * as academicService from "@/lib/services/academic-structure";
import { IconBadge } from "@/components/marketing/icon-badge";
import { SectionHeading } from "@/components/marketing/section-heading";
import { StatStrip } from "@/components/marketing/stat-strip";
import { DotGrid } from "@/components/marketing/decorative";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Why Head Mark Coaching was built differently: live classes instead of recordings, real-time parent visibility, and accountability on both sides.",
};

const PRINCIPLES = [
  {
    icon: Eye,
    title: "Parents deserve visibility",
    description:
      "Most academies tell parents everything is 'fine' until the report card says otherwise. We built our own portal so you can see attendance, homework, and test scores as they happen — not months later.",
  },
  {
    icon: Users2,
    title: "Live, not recorded",
    description:
      "Every class is a live group session with a real teacher who can answer questions and notice when a student is falling behind — not a pre-recorded video watched alone.",
  },
  {
    icon: ShieldCheck,
    title: "Accountability on both sides",
    description:
      "Teachers mark attendance and homework honestly because parents can see it. Students show up because someone is watching. That accountability is the whole product.",
  },
  {
    icon: Sparkles,
    title: "Built new, on purpose",
    description:
      "We're not a decades-old institution carrying legacy habits forward. Every part of how we teach and report back to you was built recently, around what parents and students actually need today — not what a coaching academy looked like in 1995.",
  },
];

const TEACHING_STANDARD = [
  {
    icon: GraduationCap,
    title: "Real coaching experience",
    description: "Every teacher we bring on has genuine classroom coaching experience — our faculty average 8+ years teaching board-exam students, not fresh graduates learning on the job.",
  },
  {
    icon: Video,
    title: "Live-only, no exceptions",
    description: "There is no pre-recorded track. If a class is on the schedule, a teacher is live, and students can ask questions in real time — every single session.",
  },
  {
    icon: ClipboardList,
    title: "A syllabus that's actually tracked",
    description: "Chapters taught, homework assigned, and tests conducted are all logged against the real syllabus — so nothing gets quietly skipped when exams are still months away.",
  },
];

export default async function AboutPage() {
  const [levels, boards, subjects] = await Promise.all([
    academicService.listAcademicLevels(),
    academicService.listBoards(),
    academicService.listSubjects(),
  ]);

  const stats = [
    { icon: GraduationCap, value: `${levels.filter((l) => l.isActive).length}`, label: "Class levels, Class 8 to 2nd Year" },
    { icon: Landmark, value: `${boards.filter((b) => b.isActive).length}`, label: "Boards supported nationwide" },
    { icon: BookOpen, value: `${subjects.filter((s) => s.isActive).length}+`, label: "Subjects taught by live teachers" },
    { icon: Video, value: "100%", label: "Live classes — zero recordings" },
  ];

  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-secondary/30 py-16 sm:py-20">
        <DotGrid className="h-full text-primary" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">
            <Building2 aria-hidden="true" className="h-3.5 w-3.5" /> About Us
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Why we built this differently
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            We coach students from Class 8 through 2nd Year — but what actually sets us apart isn&apos;t the
            curriculum, it&apos;s that parents are never left guessing how their child is really doing.
          </p>
        </div>
      </section>

      <div className="border-b border-border py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <StatStrip stats={stats} />
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <SectionHeading
          eyebrow="Where this started"
          title="A frustration, not a franchise"
          align="left"
          description="Head Mark Coaching wasn't spun off from an existing academy chain. It started with a simple, familiar frustration: paying for coaching every month and still having no real idea what was happening in class — no visibility into attendance, no way to know if homework was actually done, nothing until a report card showed up months later. So instead of accepting that as normal, we built the academy we'd have wanted as parents ourselves: live classes taught properly, and a portal that tells you the truth in real time instead of asking you to trust that everything's fine."
          className="max-w-none"
        />

        <div className="mt-14 space-y-5">
          {PRINCIPLES.map((p) => (
            <Card key={p.title} className="border-border/60 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="flex gap-5 p-6 sm:p-7">
                <IconBadge icon={p.icon} />
                <div>
                  <p className="font-display text-lg font-bold">{p.title}</p>
                  <p className="mt-1.5 leading-relaxed text-muted-foreground">{p.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="border-y border-border bg-secondary/30 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Our teaching standard"
            title="What we hold every class to, without exception"
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {TEACHING_STANDARD.map((t) => (
              <Card key={t.title} className="border-border/60 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                <CardContent className="p-6">
                  <IconBadge icon={t.icon} />
                  <p className="mt-4 font-display text-base font-bold">{t.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

    </>
  );
}
