import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, FileText, Lightbulb, Newspaper } from "lucide-react";
import { DotGrid } from "@/components/marketing/decorative";
import { PrimaryCta } from "@/components/marketing/cta-link";

export const metadata: Metadata = {
  title: "Resources",
  description: "Free resources for students and parents: exam preparation tips and tricks, past papers, and advice from our teachers.",
};

const ITEMS = [
  {
    href: "/resources/blog",
    icon: Newspaper,
    title: "Blog",
    description: "Advice for students and parents on studying well, staying on track and handling exam pressure.",
  },
  {
    href: "/resources/past-papers",
    icon: FileText,
    title: "Past Papers",
    description: "Board past papers and model papers by class and subject, and how to get the most from them.",
  },
  {
    href: "/resources/study-material",
    icon: Lightbulb,
    title: "Study Material",
    description: "Tips and tricks for exam preparation: how to revise each subject and manage your time in the paper.",
  },
];

export default function ResourcesPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-secondary/30 py-16 sm:py-20">
        <DotGrid className="h-full text-primary" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Resources</p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">Free help for your exam preparation</h1>
          <p className="mt-4 text-lg text-muted-foreground">Everything here is free to read. Pick a topic to start.</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon aria-hidden="true" className="h-6 w-6" />
              </span>
              <h2 className="mt-4 font-display text-xl font-bold">{item.title}</h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                Open <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-14 rounded-2xl border border-cta/30 bg-cta-wash p-8 text-center">
          <p className="font-display text-2xl font-bold">Want a teacher beside you?</p>
          <p className="mt-2 text-muted-foreground">Join a live class free for a trial and see the difference guided preparation makes.</p>
          <PrimaryCta href="/enroll" className="mt-5">
            Book Free Trial
          </PrimaryCta>
        </div>
      </div>
    </>
  );
}
