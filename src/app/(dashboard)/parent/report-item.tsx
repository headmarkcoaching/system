import { CalendarCheck, ClipboardList, MessageSquareQuote, ArrowRight, TrendingUp, AlertTriangle } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

export type PerfTone = "success" | "warning" | "destructive";

// Same 75/50 thresholds already used for the attendance subject-cards elsewhere in the app —
// kept here so every color-coded number on the parent side reads consistently.
export function perfTone(percent: number): PerfTone {
  if (percent >= 75) return "success";
  if (percent >= 50) return "warning";
  return "destructive";
}

export const TONE_CLASSES: Record<PerfTone, string> = {
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  destructive: "text-destructive bg-destructive/10",
};

interface ParentReportData {
  periodStart: Date;
  periodEnd: Date;
  attendancePercent: number;
  homeworkCompletionPercent: number;
  overallScore: number | null;
  teacherFeedback: string | null;
  weakAreas: string | null;
  nextWeekGoal: string | null;
}

// Deliberately still no charts (the app's "don't overwhelm parents with analytics" rule for
// this surface) — just bolder, color-coded numbers so a glance tells a parent whether their
// child is doing fine or needs attention, instead of every stat reading in the same gray.
export function ParentReportItem({ report }: { report: ParentReportData }) {
  const attTone = perfTone(report.attendancePercent);
  const hwTone = perfTone(report.homeworkCompletionPercent);
  const scoreTone = report.overallScore != null ? perfTone(report.overallScore) : null;

  return (
    <li className="rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          {formatDate(report.periodStart)} – {formatDate(report.periodEnd)}
        </p>
        {scoreTone && (
          <div className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold", TONE_CLASSES[scoreTone])}>
            <TrendingUp className="h-4 w-4" /> {Math.round(report.overallScore!)}/100
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <div className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold", TONE_CLASSES[attTone])}>
          <CalendarCheck className="h-3.5 w-3.5" /> {Math.round(report.attendancePercent)}% Attendance
        </div>
        <div className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold", TONE_CLASSES[hwTone])}>
          <ClipboardList className="h-3.5 w-3.5" /> {Math.round(report.homeworkCompletionPercent)}% Homework
        </div>
      </div>

      {report.teacherFeedback && (
        <div className="mt-3 flex items-start gap-2 rounded-md bg-muted/50 p-2.5 text-sm">
          <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="italic">&ldquo;{report.teacherFeedback}&rdquo;</p>
        </div>
      )}

      {report.weakAreas && (
        <div className="mt-2 flex items-start gap-2 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p>
            <span className="font-semibold text-warning">Weak areas:</span> {report.weakAreas}
          </p>
        </div>
      )}

      {report.nextWeekGoal && (
        <div className="mt-2 flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-2.5 text-sm">
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <p>
            <span className="font-semibold text-primary">Next goal:</span> {report.nextWeekGoal}
          </p>
        </div>
      )}
    </li>
  );
}
