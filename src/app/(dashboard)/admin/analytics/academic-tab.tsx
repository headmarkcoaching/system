import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SimpleBarChart } from "@/components/shared/charts/simple-bar-chart";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, AlertTriangle } from "lucide-react";
import type { academicAnalytics } from "@/lib/services/analytics";

function toneColor(rate: number) {
  if (rate >= 80) return "hsl(var(--success))";
  if (rate >= 50) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

export function AcademicTab({ data }: { data: Awaited<ReturnType<typeof academicAnalytics>> }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average Attendance by Batch</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={data.attendanceByBatch.map((b) => ({ name: b.name, rate: b.rate, color: toneColor(b.rate) }))} xKey="name" yKey="rate" colorKey="color" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Average Attendance by Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={data.attendanceBySubject.map((b) => ({ name: b.name, rate: b.rate, color: toneColor(b.rate) }))} xKey="name" yKey="rate" colorKey="color" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Homework Completion by Batch</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={data.homeworkByBatch.map((b) => ({ name: b.name, rate: b.rate, color: toneColor(b.rate) }))} xKey="name" yKey="rate" colorKey="color" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test Performance by Batch</CardTitle>
          </CardHeader>
          <CardContent>
            <SimpleBarChart data={data.testPerformanceByBatch.map((b) => ({ name: b.name, average: b.average, color: toneColor(b.average) }))} xKey="name" yKey="average" colorKey="color" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Trophy className="h-4 w-4 text-success" />
            <CardTitle className="text-base">Best Performing Students</CardTitle>
          </CardHeader>
          <CardContent>
            {data.bestPerforming.length === 0 ? (
              <EmptyState title="No performance data yet" className="py-6" />
            ) : (
              <ul className="space-y-2">
                {data.bestPerforming.map((s, i) => (
                  <li key={s.studentId} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <span>
                      <Link href={`/students/${s.studentId}`} className="font-medium hover:underline">
                        {i + 1}. {s.name}
                      </Link>
                    </span>
                    <Badge variant="success">{s.score}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <CardTitle className="text-base">Students Needing Attention</CardTitle>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/at-risk">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.needsAttention.length === 0 ? (
              <EmptyState title="No at-risk students right now" className="py-6" />
            ) : (
              <ul className="space-y-2">
                {data.needsAttention.slice(0, 8).map((s) => (
                  <li key={s.student.id} className="rounded-md border border-border px-3 py-2 text-sm">
                    <Link href={`/students/${s.student.id}`} className="font-medium hover:underline">
                      {s.student.fullName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{s.reasons.join(", ")}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weakest Subjects</CardTitle>
            <CardDescription>Lowest average graded test score.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.weakestSubjects.length === 0 ? (
              <EmptyState title="No graded tests yet" className="py-6" />
            ) : (
              <ul className="space-y-1.5 text-sm">
                {data.weakestSubjects.map((s) => (
                  <li key={s.id} className="flex justify-between">
                    <span>{s.name}</span>
                    <span className="font-medium">{s.average}%</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weakest Chapters</CardTitle>
            <CardDescription>Lowest average graded test score, by subject + chapter.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.weakestChapters.length === 0 ? (
              <EmptyState title="No chapter-tagged tests yet" className="py-6" />
            ) : (
              <ul className="space-y-1.5 text-sm">
                {data.weakestChapters.map((c) => (
                  <li key={`${c.subject}-${c.chapter}`} className="flex justify-between">
                    <span>
                      {c.chapter} <span className="text-muted-foreground">({c.subject})</span>
                    </span>
                    <span className="font-medium">{c.average}%</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
