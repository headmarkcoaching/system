import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import * as academicService from "@/lib/services/academic-structure";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EnrollForm } from "./enroll-form";

export const metadata: Metadata = {
  title: "Book a Free Trial Class",
  description: "No cost, no commitment — book a free trial class at Head Mark Coaching in under a minute.",
  openGraph: {
    title: "Book a Free Trial Class — Head Mark Coaching",
    description: "Live group classes with real-time parent visibility. No cost, no commitment.",
  },
};

export default async function EnrollPage({
  searchParams,
}: {
  searchParams: { src?: string; campaign?: string; level?: string };
}) {
  const [levels, groups] = await Promise.all([academicService.listAcademicLevels(), academicService.listGroups()]);

  return (
    <div className="theme-skylight flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-background px-4 py-4 sm:px-6">
        <Link href="/home" className="mx-auto flex w-fit max-w-md items-center">
          <Image
            src="/brand/head-mark-coaching-logo.png"
            alt="Head Mark Coaching"
            width={1564}
            height={1066}
            className="h-12 w-auto"
            priority
          />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <Card className="w-full max-w-md border-primary/10 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Book Your Free Trial Class</CardTitle>
            <CardDescription>
              Live group classes with real-time parent visibility into attendance, homework, and results. No cost,
              no commitment — just fill in your details and our admissions team will reach out on WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EnrollForm
              levels={levels.filter((l) => l.isActive)}
              groups={groups.filter((g) => g.isActive)}
              defaultLevelId={searchParams.level}
              source={searchParams.src}
              campaign={searchParams.campaign}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
