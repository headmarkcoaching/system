import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as staffService from "@/lib/services/staff";
import * as batchService from "@/lib/services/batches";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/utils";
import { Video, GraduationCap, ClipboardList, TrendingUp } from "lucide-react";
import * as testService from "@/lib/services/tests";
import * as performanceService from "@/lib/services/performance";
import * as announcementService from "@/lib/services/announcements";
import { AnnouncementsCard } from "@/components/shared/announcements-card";
import { NextActionsCard } from "@/components/shared/next-actions-card";
import * as nextActionsService from "@/lib/services/next-actions";

export default async function TeacherDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const teacher = await staffService.getTeacherByUserId(session.user.id);
  if (!teacher) {
    return <EmptyState title="No teacher profile found" description="Ask an admin to link your account to a teacher profile." />;
  }

  const [todaysClasses, homework, batches, tests, atRiskStudents, announcements] = await Promise.all([
    batchService.listTodaysClassesForTeacher(teacher.id),
    batchService.listHomeworkForTeacher(teacher.id),
    batchService.listBatchesForTeacher(teacher.id),
    testService.listTestsForTeacher(teacher.id),
    performanceService.listAtRiskStudents(),
    announcementService.listAnnouncementsForUser(session.user.id, session.user.role),
  ]);

  const pendingReview = homework.reduce((sum, hw) => sum + hw.submissions.filter((s) => s.status === "SUBMITTED").length, 0);
  const upcomingTests = tests.filter((t) => t.status === "SCHEDULED" || t.status === "ACTIVE").length;
  const batchIds = new Set(batches.map((b) => b.id));
  const myAtRiskStudents = atRiskStudents.filter((r) => r.batch && batchIds.has(r.batch.id));

  const priorityActions = (
    await Promise.all(
      myAtRiskStudents.slice(0, 5).map(async (r) => {
        const actions = await nextActionsService.getNextActionsForStudent(r.student.id);
        return actions[0] ? { ...actions[0], title: `${r.student.fullName}: ${actions[0].title}` } : null;
      })
    )
  ).filter((a): a is NonNullable<typeof a> => a !== null);

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${session.user.name.split(" ")[0]}`} description="Which students need your help today?" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="My Batches" value={batches.length} icon={GraduationCap} />
        <StatCard label="Today's Classes" value={todaysClasses.length} icon={Video} />
        <StatCard label="Homework to Review" value={pendingReview} icon={ClipboardList} tone={pendingReview > 0 ? "warning" : "default"} />
        <StatCard label="Upcoming Tests" value={upcomingTests} icon={TrendingUp} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Classes</CardTitle>
        </CardHeader>
        <CardContent>
          {todaysClasses.length === 0 ? (
            <EmptyState title="No classes today" className="py-8" />
          ) : (
            <ul className="space-y-2">
              {todaysClasses.map((c) => (
                <li key={c.id} className="flex flex-col gap-2 rounded-md border border-border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.batch.name} · {c.subject.name} · {formatTime(c.startTime)}–{formatTime(c.endTime)}
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <Link href={`/batches/${c.batchId}?tab=classes`}>Start Class</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Students Needing Attention</CardTitle>
        </CardHeader>
        <CardContent>
          {myAtRiskStudents.length === 0 ? (
            <EmptyState title="No students currently need extra attention" className="py-8" />
          ) : (
            <ul className="space-y-2">
              {myAtRiskStudents.map((r) => (
                <li key={r.student.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <Link href={`/students/${r.student.id}`} className="min-w-0">
                    <p className="truncate font-medium hover:underline">{r.student.fullName}</p>
                    <p className="text-xs text-muted-foreground">{r.reasons.join(", ")}</p>
                  </Link>
                  <Badge variant="warning">{r.suggestedAction}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <NextActionsCard title="Priority Actions" actions={priorityActions} />

      <Card>
        <CardHeader>
          <CardTitle>My Batches</CardTitle>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <EmptyState title="No batches assigned yet" className="py-8" />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {batches.map((b) => (
                <li key={b.id}>
                  <Link href={`/batches/${b.id}`} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-accent">
                    <span className="font-medium">{b.name}</span>
                    <Badge variant="outline">{b._count.students} students</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AnnouncementsCard announcements={announcements} />
    </div>
  );
}
