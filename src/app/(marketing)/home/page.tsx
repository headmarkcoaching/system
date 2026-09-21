import Link from "next/link";
import {
  CheckCircle2,
  MessageCircle,
  Video,
  Eye,
  ClipboardCheck,
  CalendarCheck2,
  TrendingUp,
  X,
  Quote,
  Package,
  ShieldOff,
  History,
  FileCheck2,
  GraduationCap,
  Landmark,
  BookOpen,
} from "lucide-react";
import type { Metadata } from "next";
import * as academicService from "@/lib/services/academic-structure";
import { PrimaryCta, SecondaryCta } from "@/components/marketing/cta-link";
import { IconBadge } from "@/components/marketing/icon-badge";
import { SectionHeading } from "@/components/marketing/section-heading";
import { StatStrip } from "@/components/marketing/stat-strip";
import { FaqList } from "@/components/marketing/faq-list";
import { DotGrid, AchievementWatermark } from "@/components/marketing/decorative";
import { Reveal } from "@/components/marketing/reveal";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Live Group Classes with Real-Time Parent Visibility",
  description:
    "Live group coaching for Class 8 through 2nd Year, across Punjab, Federal, Sindh & KPK boards — with a parent portal showing attendance, homework, and results in real time. Book a free trial class.",
  openGraph: {
    title: "Know how your child is really doing — every single day.",
    description: "Live group classes with real teachers, plus a parent portal that shows attendance, homework, and results the moment they happen.",
  },
};

const VALUE_PROPS = [
  {
    icon: Video,
    title: "Real Classes, Not Recordings",
    description: "A live teacher, a live group, live questions answered — every session, not a video your child watches alone.",
  },
  {
    icon: Eye,
    title: "See It As It Happens",
    description: "Attendance, homework, and test scores update the moment they happen — not weeks later on a report card.",
  },
  {
    icon: MessageCircle,
    title: "Updates On WhatsApp",
    description: "No app to check, no login to remember. Weekly progress and fee reminders land where you already look.",
  },
  {
    icon: CheckCircle2,
    title: "Try Before You Commit",
    description: "Sit in on a real class first. If it's not right for your child, you've spent nothing finding out.",
  },
];

const COMPARISON_ROWS = [
  { typical: "Pre-recorded videos, watch whenever", us: "Live classes, every session, real teacher" },
  { typical: "You find out at report-card time", us: "Attendance and results update in real time" },
  { typical: "Attendance is self-reported, rarely checked", us: "Logged every class, visible to you instantly" },
  { typical: "Homework goes missing without you knowing", us: "Completion tracked and visible as it happens" },
  { typical: "You pay first, then hope it works out", us: "Free trial class before you commit to anything" },
];

const EXAM_PREP = [
  {
    title: "Full Syllabus, Chapter by Chapter",
    description: "Every chapter taught live and tracked — nothing quietly skipped when boards are still months away.",
  },
  {
    title: "Regular Tests, Not Just Finals",
    description: "Practice tests throughout the term surface weak chapters early, while there's still time to fix them.",
  },
  {
    title: "Attendance That Actually Matters",
    description: "When attendance is visible to you, it stops being optional for your child — that alone changes outcomes.",
  },
  {
    title: "Doubts Cleared Live, Same Class",
    description: "A live group means a raised hand gets answered on the spot, not left for a video your child can't ask questions of.",
  },
];

// Real, shipped features that most online academies genuinely don't offer — not marketing
// puffery, each of these maps to an actual product decision covered elsewhere in the app.
// Real, shipped product decisions — not marketing language. Framed as a ledger of guarantees
// (matching the brand's own "mark sheet" identity) because every one of these is something a
// parent can go verify inside the portal themselves, not just a claim on a page.
const GUARANTEES = [
  {
    code: "G-01",
    icon: History,
    title: "Missed a class? You have 48 hours.",
    description: "Every session records automatically and stays available to watch for two days afterward — genuinely missed that window? Just ask the teacher for access.",
  },
  {
    code: "G-02",
    icon: ShieldOff,
    title: "Zero AI on homework or tests.",
    description: "We don't hand students an AI shortcut that quietly does the thinking for them. Every assignment stays teacher-led, so the effort — and the learning — is genuinely theirs.",
  },
  {
    code: "G-03",
    icon: FileCheck2,
    title: "Test results you can actually review.",
    description: "Not just a percentage. Your child can see exactly which questions they got right or wrong, with marks — real preparation for the next exam, not a mystery grade.",
  },
  {
    code: "G-04",
    icon: Package,
    title: "Notes mailed to your door.",
    description: "Once enrolled, subscribe per subject and we post official study notes to your home every month — for families who want something in hand, not just on a screen.",
  },
];

const FAQS = [
  {
    q: "Are the classes really live, or is this pre-recorded video?",
    a: "Every class is 100% live, with a real teacher and a real group of students — never a pre-recorded video. If a live teacher isn't answering your child's questions in real time, it isn't a Head Mark Coaching class.",
  },
  {
    q: "What happens if my child misses a class?",
    a: "Every session records automatically and stays available to watch for 48 hours afterward. If you genuinely missed that window, you can request access from the teacher directly.",
  },
  {
    q: "How do I actually know what's going on, without asking my child every day?",
    a: "Your parent portal shows attendance, homework status, and test scores the moment they're recorded — not weeks later on a report card. If you'd rather not log in daily, a WhatsApp summary lands every Friday.",
  },
  {
    q: "Can we try a class before paying anything?",
    a: "Yes. Book a free trial class for your child's level and sit in on a real session with a real teacher. There's no cost and no obligation to continue afterward.",
  },
  {
    q: "Which boards and classes do you cover?",
    a: "We coach Class 8 through 2nd Year, across the Punjab, Federal, Sindh, and KPK boards — full matric subjects for Class 8–10, and Pre-Medical, Pre-Engineering, ICS, I.Com, and FA groups for 1st & 2nd Year.",
  },
  {
    q: "How does pricing work?",
    a: "One fixed monthly fee per student, billed simply — see our Pricing page for exact numbers. No hidden charges, and no surprise add-ons unless you choose one yourself, like the optional printed-notes subscription.",
  },
  {
    q: "Can we cancel if it isn't working out?",
    a: "Yes, any time. There's no lock-in contract — that's exactly why we let you trial a class for free before you ever pay.",
  },
  {
    q: "Does my child get access to AI tools through the academy?",
    a: "No — deliberately. We keep AI out of students' hands on our platform, so homework, tests, and revision stay genuinely your child's own work, guided by a real teacher.",
  },
];

// No fabricated quotes here — real parent feedback goes in this array once the first cohort
// completes a full term. Until then the section below renders an honest "coming soon" state
// rather than invented testimonials.
const TESTIMONIALS: { quote: string; name: string; detail: string }[] = [];

const LEVELS = ["Class 8", "Class 9", "Class 10", "1st Year", "2nd Year"];

const HOW_IT_WORKS = [
  { step: "1", title: "Book a Free Trial", description: "Tell us your child's class — it takes less than a minute." },
  { step: "2", title: "Attend a Live Class", description: "Our counselor schedules a real trial session with the subject teacher." },
  { step: "3", title: "Enroll & Stay Informed", description: "Get full parent-portal access — attendance, results, and fees, always visible." },
];

export default async function MarketingHomePage() {
  const [levels, boards, subjects] = await Promise.all([
    academicService.listAcademicLevels(),
    academicService.listBoards(),
    academicService.listSubjects(),
  ]);

  const activeLevelCount = levels.filter((l) => l.isActive).length;
  const activeBoardCount = boards.filter((b) => b.isActive).length;
  const activeSubjectCount = subjects.filter((s) => s.isActive).length;

  const stats = [
    { icon: GraduationCap, value: `${activeLevelCount}`, label: "Class levels, Class 8 to 2nd Year" },
    { icon: Landmark, value: `${activeBoardCount}`, label: "Boards supported nationwide" },
    { icon: BookOpen, value: `${activeSubjectCount}+`, label: "Subjects taught by live teachers" },
    { icon: Video, value: "100%", label: "Live classes — zero recordings" },
  ];

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden pb-20 sm:pb-24 lg:pb-32">
        <DotGrid className="h-[560px]" />
        <AchievementWatermark className="-right-20 -top-16 h-[420px] w-[420px] rotate-[8deg] text-primary/[0.05] lg:h-[520px] lg:w-[520px]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pt-16 sm:px-6 sm:pt-20 lg:grid-cols-2 lg:gap-10 lg:pt-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-secondary px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">
              Class 8 &mdash; 2nd Year &middot; All Boards
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.25rem]">
              Know how your child is <span className="text-primary">really doing</span> — every single day.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Live group classes with real teachers, plus a parent portal that shows attendance, homework, and
              results the moment they happen — not weeks later.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryCta href="/enroll" size="lg">
                Book a Free Trial Class
              </PrimaryCta>
              <SecondaryCta href="/programs" size="lg">
                See Programs
              </SecondaryCta>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">No credit card required &middot; Takes under a minute</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-primary" /> No cost to try
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-primary" /> Cancel any time
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-primary" /> Punjab, Federal, Sindh &amp; KPK boards
              </span>
            </div>
          </div>

          {/* A weekly progress report, not a fake "browser window" dashboard screenshot — this
              is what a parent portal for an academy called Head MARK should actually look and
              feel like: a real record, in the same visual language as a report card, not a
              generic SaaS product shot. */}
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-primary/10 blur-2xl" aria-hidden="true" />
            <Card className="overflow-hidden border-border/70 shadow-2xl transition-transform duration-500 lg:rotate-1 lg:hover:rotate-0">
              <CardContent className="p-6 sm:p-7">
                <div className="flex items-center justify-between border-b-2 border-dashed border-border pb-4">
                  <div>
                    <p className="font-display text-lg italic tracking-tight">Head Mark Coaching</p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Weekly Progress Report
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                    </span>
                    Live
                  </span>
                </div>

                <div className="divide-y divide-dashed divide-border">
                  <div className="flex items-center justify-between py-3.5">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <CalendarCheck2 aria-hidden="true" className="h-4 w-4 text-primary" /> Attendance
                    </span>
                    <span className="font-ledger text-lg font-semibold tabular-nums">92%</span>
                  </div>
                  <div className="flex items-center justify-between py-3.5">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <ClipboardCheck aria-hidden="true" className="h-4 w-4 text-primary" /> Homework Completed
                    </span>
                    <span className="font-ledger text-lg font-semibold tabular-nums">100%</span>
                  </div>
                  <div className="flex items-center justify-between py-3.5">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <TrendingUp aria-hidden="true" className="h-4 w-4 text-primary" /> Test Average
                    </span>
                    {/* The one hand-marked flourish, not a generic checkmark icon — an
                        irregular, imperfect stroke path reads as a real teacher's red pen,
                        not another Lucide glyph. */}
                    <span className="inline-flex items-center gap-1.5">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 20 20"
                        className="h-4 w-4 shrink-0"
                        style={{ color: "#B33A3A" }}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3,10.5 L8,15.5 L17,4.5" />
                      </svg>
                      <span className="font-ledger text-lg font-semibold tabular-nums">78%</span>
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-xl bg-cta-wash px-4 py-3 text-sm text-foreground">
                  <MessageCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-cta" />
                  Weekly report sent to WhatsApp — every Friday.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* STATS STRIP — real, current numbers pulled from the live academic structure, not invented
          marketing claims. Pulled up to overlap the hero so it reads as one continuous moment. */}
      <section className="relative z-10 -mt-14 pb-16 sm:-mt-16 sm:pb-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <StatStrip stats={stats} />
        </div>
      </section>

      {/* VALUE PROPS */}
      <section className="bg-secondary/30 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Why parents choose us"
            title="Most academies keep parents in the dark. We turn the lights on."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {VALUE_PROPS.map((v) => (
              <Card key={v.title} className="border-border/60 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                <CardContent className="p-6">
                  <IconBadge icon={v.icon} />
                  <p className="mt-5 font-display text-base font-bold">{v.title}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{v.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* HOW WE'RE DIFFERENT */}
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <SectionHeading eyebrow="How we're different" title="Not just another tuition academy." />
          <div className="relative mt-12 grid gap-5 sm:grid-cols-2">
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 z-10 hidden h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-background bg-foreground text-[11px] font-bold text-background shadow-md sm:flex"
            >
              VS
            </span>
            <Card className="border-border/60 bg-muted/40">
              <CardContent className="p-6 sm:p-7">
                <p className="font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">Most Academies</p>
                <ul className="mt-4 space-y-3.5">
                  {COMPARISON_ROWS.map((row) => (
                    <li key={row.typical} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <X aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70" />
                      {row.typical}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="relative overflow-hidden border-2 border-primary/25 bg-gradient-to-br from-primary/[0.06] to-transparent shadow-xl lg:-translate-y-1 lg:scale-[1.03]">
              <CardContent className="p-6 sm:p-7">
                <p className="font-display text-sm font-bold uppercase tracking-wide text-primary">Head Mark Coaching</p>
                <ul className="mt-4 space-y-3.5">
                  {COMPARISON_ROWS.map((row) => (
                    <li key={row.us} className="flex items-start gap-2.5 text-sm font-medium">
                      <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {row.us}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* BOARD EXAM PREP — a deliberate dark band, the one confident tonal break in an otherwise
          light page, so it reads as a distinct, weightier claim rather than another feature grid. */}
      <section className="relative overflow-hidden bg-foreground py-20 text-background sm:py-24">
        <AchievementWatermark className="-left-24 -top-16 h-[420px] w-[420px] -rotate-12 text-white/[0.05] lg:h-[500px] lg:w-[500px]" />
        <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-xl text-center">
            {/* Fixed tint, not text-primary/70 — that only reaches 2.36:1 against this navy,
                well under WCAG AA's 4.5:1 floor for text this small. */}
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "#7FA6DD" }}>
              Built for board results
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-balance">
              Real preparation for real board exams.
            </h2>
            <p className="mt-3 leading-relaxed text-background/65">
              Good grades come from consistency, not a last-minute cram. Here&apos;s how we build that in.
            </p>
          </div>
          <div className="mt-16 grid gap-x-10 gap-y-12 sm:grid-cols-2">
            {EXAM_PREP.map((e, i) => (
              <Reveal key={e.title} delay={i * 100} className="flex gap-5">
                {/* A fixed lighter tint, not text-primary/60 — the base primary blue only reaches
                    ~3.3:1 against this navy at full opacity (2.08:1 at the previous 60% alpha),
                    under WCAG AA's 3:1 floor even for this large text. This shade (already used
                    for the reversed logo variant) clears 5.73:1. */}
                <span className="shrink-0 font-ledger text-5xl font-semibold leading-none tabular-nums" style={{ color: "#7FA6DD" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-display text-lg font-bold">{e.title}</p>
                  <p className="mt-1.5 leading-relaxed text-background/65">{e.description}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* GUARANTEES — styled as an actual ledger/certificate, not another icon-card grid, so it
          reads as a record you could go verify yourself rather than a marketing list. */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="On the record"
            title="A few promises we're happy to put in writing."
            description="Real product decisions, not marketing language — every one of these is something you can go check inside the portal yourself."
          />

          <Reveal className="mt-12">
            <div className="overflow-hidden rounded-2xl border-2 border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b-2 border-dashed border-border bg-secondary/30 px-6 py-4 sm:px-8">
                <span className="font-display text-base italic tracking-tight">Head Mark Coaching</span>
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Service Guarantees
                </span>
              </div>
              <div className="divide-y divide-dashed divide-border">
                {GUARANTEES.map((g) => (
                  <div key={g.code} className="flex gap-4 px-6 py-6 sm:gap-5 sm:px-8">
                    <IconBadge icon={g.icon} className="hidden sm:flex" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2.5">
                        <span className="font-ledger text-xs font-semibold tabular-nums text-muted-foreground">
                          {g.code}
                        </span>
                        <p className="font-display text-lg font-bold">{g.title}</p>
                      </div>
                      <p className="mt-1.5 leading-relaxed text-muted-foreground">{g.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* PROGRAMS TEASER */}
      <section className="border-y border-border bg-secondary/30 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-primary">Every class, every board</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-balance">
                One academy for the whole journey — Class 8 to 2nd Year.
              </h2>
              <p className="mt-4 max-w-md text-muted-foreground">
                Matric coaching for Class 8&ndash;10, and Intermediate coaching for 1st &amp; 2nd Year across
                Pre-Medical, Pre-Engineering, ICS, I.Com, and FA.
              </p>
              <div className="mt-7">
                <PrimaryCta href="/programs">Explore Programs</PrimaryCta>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {LEVELS.map((l) => (
                <Link
                  key={l}
                  href={`/programs`}
                  className="rounded-2xl border border-border bg-card px-5 py-4 font-display text-sm font-bold shadow-sm transition-colors hover:border-primary/40 hover:bg-secondary/50"
                >
                  {l}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* STATEMENT — one confident, oversized line as a deliberate pattern-break between the
          feature sections above and the softer testimonials/FAQ below. */}
      <section className="relative overflow-hidden bg-primary py-20 text-center text-primary-foreground sm:py-28">
        <AchievementWatermark className="left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 text-white/[0.07] sm:h-[640px] sm:w-[640px]" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal>
            <p className="font-display text-3xl font-bold leading-[1.15] tracking-tight text-balance sm:text-5xl">
              Every class is live. Every result is visible.
            </p>
          </Reveal>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading eyebrow="What parents are saying" title="We're just getting started." />

          {TESTIMONIALS.length > 0 ? (
            <div className="mt-12 grid gap-5 sm:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <Card key={t.name} className="border-border/60">
                  <CardContent className="p-6">
                    <Quote aria-hidden="true" className="h-6 w-6 text-primary/40" />
                    <p className="mt-3 text-sm leading-relaxed text-foreground">{t.quote}</p>
                    <p className="mt-4 font-display text-sm font-bold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.detail}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="mx-auto mt-10 max-w-lg rounded-3xl border border-dashed border-primary/25 bg-card px-6 py-10 text-center">
              <Quote aria-hidden="true" className="mx-auto h-8 w-8 text-primary/40" />
              <p className="mt-3 text-muted-foreground">
                Real stories from our first cohort of parents will appear here once their first term wraps up. Until
                then, the best way to know if this is right for your child is to sit in on a class yourself.
              </p>
              <div className="mt-6 flex justify-center">
                <PrimaryCta href="/enroll">Book a Free Trial Class</PrimaryCta>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS — a connected path rather than three loose circles, echoing the logo's own
          ascending checkmark: each step is a stop along one continuous line toward enrollment. */}
      <section className="border-y border-border py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <SectionHeading eyebrow="The process" title="How to get started" />
          <div className="relative mt-16 grid gap-10 sm:grid-cols-3">
            <div
              aria-hidden="true"
              className="absolute top-6 hidden h-0.5 bg-gradient-to-r from-primary via-primary to-cta sm:block"
              style={{ left: "16.6667%", right: "16.6667%" }}
            />
            {HOW_IT_WORKS.map((s, i) => (
              <div key={s.step} className="relative text-center">
                <div className="relative z-10 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary font-display text-base font-bold text-primary-foreground shadow-sm ring-4 ring-background">
                  {i === HOW_IT_WORKS.length - 1 ? <CheckCircle2 aria-hidden="true" className="h-6 w-6" /> : s.step}
                </div>
                <p className="mt-4 font-display text-base font-bold">{s.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 flex justify-center">
            <PrimaryCta href="/enroll" size="lg">
              Book a Free Trial Class
            </PrimaryCta>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <SectionHeading eyebrow="Questions parents ask" title="Everything you'd want to know before enrolling." />
          <div className="mt-12">
            <FaqList items={FAQS} />
          </div>
        </div>
      </section>
    </>
  );
}
