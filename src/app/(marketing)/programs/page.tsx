import { GraduationCap, BookOpen, Video, ClipboardList, MessageCircleQuestion } from "lucide-react";
import type { Metadata } from "next";
import * as academicService from "@/lib/services/academic-structure";
import { PrimaryCta } from "@/components/marketing/cta-link";
import { IconBadge } from "@/components/marketing/icon-badge";
import { SectionHeading } from "@/components/marketing/section-heading";
import { DotGrid } from "@/components/marketing/decorative";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Programs — Class 8 to 2nd Year",
  description:
    "Matric coaching for Class 8–10 and Intermediate coaching for 1st & 2nd Year across Pre-Medical, Pre-Engineering, ICS, I.Com, and FA. Find the right class for your child.",
};

const MATRIC_SUBJECTS = ["English", "Urdu", "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "Islamiyat", "Pakistan Studies"];
const INTERMEDIATE_NOTE = "Subjects depend on your group — Pre-Medical, Pre-Engineering, ICS, I.Com, or FA.";

const STRUCTURE_TAGS = [
  { icon: Video, label: "Live classes, every session" },
  { icon: ClipboardList, label: "Regular chapter-wise tests" },
  { icon: MessageCircleQuestion, label: "Doubts cleared live" },
];

export default async function ProgramsPage() {
  const [levels, boards, groups] = await Promise.all([
    academicService.listAcademicLevels(),
    academicService.listBoards(),
    academicService.listGroups(),
  ]);

  const activeLevels = levels.filter((l) => l.isActive);
  const activeBoards = boards.filter((b) => b.isActive);
  const activeGroups = groups.filter((g) => g.isActive);
  const isIntermediate = (name: string) => name.includes("Year");

  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-secondary/30 py-16 sm:py-20">
        <DotGrid className="h-full text-primary" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">
            <GraduationCap aria-hidden="true" className="h-3.5 w-3.5" /> Programs
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Find the right class for your child
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Live group coaching from Class 8 through 2nd Year, across {activeBoards.map((b) => b.name).join(", ")}.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground">
            {STRUCTURE_TAGS.map((t) => {
              const Icon = t.icon;
              return (
                <span key={t.label} className="inline-flex items-center gap-1.5">
                  <Icon aria-hidden="true" className="h-4 w-4 text-primary" /> {t.label}
                </span>
              );
            })}
          </div>
          <div className="mt-8 flex justify-center">
            <PrimaryCta href="/enroll" size="lg">
              Book a Free Trial Class
            </PrimaryCta>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading
          eyebrow="How every level is taught"
          title="Same structure at every level — just different syllabus"
          description="Whichever class or group your child is in, the format doesn't change: a live teacher, the full syllabus taught chapter by chapter, and regular tests that surface weak spots while there's still time to fix them."
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {activeLevels.map((level) => (
            <Card
              key={level.id}
              className={`flex flex-col border-border/60 border-t-4 ${isIntermediate(level.name) ? "border-t-foreground" : "border-t-primary"} transition-all duration-200 hover:-translate-y-1 hover:shadow-md`}
            >
              <CardHeader className="flex-row items-center gap-4 space-y-0">
                <IconBadge icon={isIntermediate(level.name) ? GraduationCap : BookOpen} />
                <CardTitle className="text-xl">{level.name}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col">
                {isIntermediate(level.name) ? (
                  <>
                    <p className="text-sm text-muted-foreground">{INTERMEDIATE_NOTE}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {activeGroups.map((g) => (
                        <span key={g.id} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">
                          {g.name}
                        </span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {MATRIC_SUBJECTS.map((s) => (
                      <span key={s} className="rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-6 pt-1">
                  <PrimaryCta href={`/enroll?level=${level.id}`} className="w-full">
                    Book a Free Trial for {level.name}
                  </PrimaryCta>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
