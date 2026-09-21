"use client";

import { CalendarClock, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ProgressBar } from "@/components/shared/progress-bar";
import { FilterSelect } from "@/components/shared/filter-bar";
import { formatDate } from "@/lib/utils";
import type { getExamPrepData } from "@/lib/services/exam-prep";

type ExamPrepData = Awaited<ReturnType<typeof getExamPrepData>>;

export function ExamPrepView({ data }: { data: ExamPrepData }) {
  const test = data.targetTest!;

  return (
    <div className="space-y-6">
      {data.upcoming.length > 1 && (
        <FilterSelect paramKey="test" placeholder="Choose a test" defaultValue={test.id} options={data.upcoming.map((t) => ({ value: t.id, label: `${t.name} (${t.subject.name})` }))} />
      )}

      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-6 text-center">
          <CalendarClock className="h-6 w-6 text-primary" />
          <p className="text-sm text-muted-foreground">
            {test.name} · {test.subject.name}
          </p>
          <p className="text-5xl font-bold">{data.daysRemaining}</p>
          <p className="text-sm text-muted-foreground">day{data.daysRemaining === 1 ? "" : "s"} remaining · {formatDate(test.startDate)}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <TrendingDown className="h-4 w-4 text-destructive" />
            <CardTitle className="text-base">Weak Chapters</CardTitle>
          </CardHeader>
          <CardContent>
            {data.weakChapters.length === 0 ? (
              <EmptyState title="No chapter-level test history yet" className="py-4" />
            ) : (
              <ul className="space-y-1.5 text-sm">
                {data.weakChapters.map((c) => (
                  <li key={c.chapter} className="flex items-center justify-between">
                    <span>{c.chapter}</span>
                    <Badge variant={c.average >= 70 ? "success" : c.average >= 40 ? "warning" : "destructive"}>{c.average}%</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Study Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ProgressBar label={`${test.subject.name} learning path`} value={data.studyProgress} />
            <p className="text-xs text-muted-foreground">Based on lectures attended/watched, notes read, homework submitted, and quizzes attempted for this subject.</p>
          </CardContent>
        </Card>
      </div>

      {data.otherUpcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Further Practice Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-xs text-muted-foreground">Other scheduled {test.subject.name} tests you haven&apos;t attempted yet.</p>
            <ul className="space-y-1.5 text-sm">
              {data.otherUpcoming.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <span>{t.name}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(t.startDate)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
