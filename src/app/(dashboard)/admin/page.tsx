import Link from "next/link";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnnouncementsCard } from "@/components/shared/announcements-card";
import { DetailsToggle } from "@/components/shared/details-toggle";
import { formatTime, formatPKR, formatDate } from "@/lib/utils";
import { GraduationCap, Users, CalendarCheck, TrendingUp, Video, AlertTriangle, Wallet, UserPlus, BarChart3, MessageCircle, Sparkles, Activity } from "lucide-react";
import * as testService from "@/lib/services/tests";
import * as performanceService from "@/lib/services/performance";
import * as paymentsService from "@/lib/services/payments";
import * as leadService from "@/lib/services/leads";
import * as announcementService from "@/lib/services/announcements";
import { getExecutiveDashboard } from "@/lib/services/executive-dashboard";
import { auth } from "@/lib/auth";
import { NextActionsCard } from "@/components/shared/next-actions-card";
import * as nextActionsService from "@/lib/services/next-actions";

export default async function AdminDashboardPage() {
  const session = await auth();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const [
    activeStudents,
    trialStudents,
    totalBatches,
    todaysClasses,
    attendanceAgg,
    avgTestScore,
    atRiskStudents,
    paymentsSummary,
    pipeline,
    followupsDue,
    newLeadsThisWeek,
    announcements,
    executiveData,
  ] = await Promise.all([
    db.student.count({ where: { status: "ACTIVE" } }),
    db.student.count({ where: { status: "TRIAL" } }),
    db.batch.count({ where: { status: "ACTIVE" } }),
    db.liveClass.findMany({
      where: { scheduledDate: { gte: start, lte: end } },
      include: { batch: true, subject: true, teacher: true },
      orderBy: { startTime: "asc" },
    }),
    db.attendance.groupBy({ by: ["status"], _count: true }),
    testService.getAcademyAverageTestScore(),
    performanceService.listAtRiskStudents(),
    paymentsService.paymentsSummary(),
    leadService.pipelineSummary(),
    leadService.listFollowupsDue(),
    db.lead.count({ where: { createdAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
    session?.user ? announcementService.listAnnouncementsForUser(session.user.id, session.user.role) : Promise.resolve([]),
    getExecutiveDashboard(),
  ]);

  const totalMarks = attendanceAgg.reduce((sum, g) => sum + g._count, 0);
  const presentMarks = attendanceAgg.filter((g) => g.status === "PRESENT" || g.status === "LATE").reduce((sum, g) => sum + g._count, 0);
  const avgAttendance = totalMarks === 0 ? 0 : Math.round((presentMarks / totalMarks) * 100);

  const priorityActions = (
    await Promise.all(
      atRiskStudents.slice(0, 5).map(async (r) => {
        const actions = await nextActionsService.getNextActionsForStudent(r.student.id);
        return actions[0] ? { ...actions[0], title: `${r.student.fullName}: ${actions[0].title}` } : null;
      })
    )
  ).filter((a): a is NonNullable<typeof a> => a !== null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        description="What needs your attention today."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/analytics">
              <BarChart3 className="mr-1.5 h-4 w-4" /> View Analytics
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Active Students" value={activeStudents} icon={GraduationCap} />
        <StatCard label="Trial Students" value={trialStudents} icon={Users} />
        <StatCard label="New Leads (7 days)" value={newLeadsThisWeek} icon={UserPlus} />
        <StatCard label="Pending Payments" value={formatPKR(paymentsSummary.pendingAmount + paymentsSummary.overdueAmount)} icon={Wallet} tone={paymentsSummary.overdueAmount > 0 ? "warning" : "default"} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Active Batches" value={totalBatches} icon={Video} />
        <StatCard label="Average Attendance" value={`${avgAttendance}%`} icon={CalendarCheck} tone={avgAttendance >= 75 ? "success" : "warning"} />
        <StatCard label="Average Test Score" value={avgTestScore != null ? `${avgTestScore}%` : "—"} icon={TrendingUp} hint={avgTestScore == null ? "No graded tests yet" : undefined} />
        <StatCard label="At-Risk Students" value={atRiskStudents.length} icon={AlertTriangle} tone={atRiskStudents.length > 0 ? "destructive" : "default"} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s Classes</CardTitle>
          </CardHeader>
          <CardContent>
            {todaysClasses.length === 0 ? (
              <EmptyState title="No classes scheduled today" className="py-8" />
            ) : (
              <ul className="space-y-2">
                {todaysClasses.map((c) => (
                  <li key={c.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <div>
                      <Link href={`/batches/${c.batchId}`} className="font-medium hover:underline">
                        {c.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {c.batch.name} · {c.subject.name} · {c.teacher.fullName}
                      </p>
                    </div>
                    <Badge variant={c.status === "LIVE" ? "destructive" : "outline"}>{formatTime(c.startTime)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>At-Risk Students</CardTitle>
          </CardHeader>
          <CardContent>
            {atRiskStudents.length === 0 ? (
              <EmptyState title="No students currently at risk" className="py-8" />
            ) : (
              <ul className="space-y-2">
                {atRiskStudents.slice(0, 5).map((r) => (
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
            {atRiskStudents.length > 0 && (
              <Link href="/admin/at-risk" className="mt-3 block text-center text-sm text-primary hover:underline">
                View all {atRiskStudents.length}
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5">
              {pipeline
                .filter((p) => p.count > 0)
                .map((p) => (
                  <li key={p.stage} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{p.stage.replace(/_/g, " ")}</span>
                    <Badge variant="outline">{p.count}</Badge>
                  </li>
                ))}
              {pipeline.every((p) => p.count === 0) && <EmptyState title="No leads yet" className="py-6" />}
            </ul>
            <Link href="/admin/leads" className="mt-3 block text-center text-sm text-primary hover:underline">
              View all leads
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Follow-Ups</CardTitle>
          </CardHeader>
          <CardContent>
            {followupsDue.length === 0 ? (
              <EmptyState title="No follow-ups due" className="py-8" />
            ) : (
              <ul className="space-y-2">
                {followupsDue.slice(0, 5).map((f) => (
                  <li key={f.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <Link href={`/leads/${f.leadId}`} className="min-w-0">
                      <p className="truncate font-medium hover:underline">{f.lead.studentName}</p>
                      <p className="text-xs text-muted-foreground">Due {formatDate(f.dueDate)}</p>
                    </Link>
                    <Badge variant={f.dueDate < new Date() ? "destructive" : "outline"}>{f.dueDate < new Date() ? "Overdue" : "Today"}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <NextActionsCard title="Priority Actions" actions={priorityActions} />

      <DetailsToggle label="Academy Health Overview">
        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Business Health</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Enrollments" value={executiveData.business.totalEnrollments} icon={GraduationCap} />
            <StatCard label="Conversion Rate" value={`${executiveData.business.conversionRate}%`} icon={TrendingUp} />
            <StatCard label="Collected This Month" value={`Rs ${executiveData.business.collectedThisMonth.toLocaleString()}`} icon={Wallet} />
            <StatCard label="Retention Rate" value={`${executiveData.retention.retentionRate}%`} icon={Users} />
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Academic &amp; Student Health</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="At-Risk Students"
              value={executiveData.atRiskCount}
              icon={AlertTriangle}
              tone={executiveData.atRiskCount > 0 ? "destructive" : "success"}
            />
            <StatCard label="Best Batch Attendance" value={`${executiveData.academic.attendanceByBatch[0]?.rate ?? 0}%`} icon={Activity} />
            <StatCard label="Teachers" value={executiveData.teacherOps.teacherCount} icon={Users} />
            <StatCard label="Homework Review Rate" value={`${executiveData.teacherOps.homeworkReviewRate}%`} icon={GraduationCap} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageCircle className="h-4 w-4 text-primary" /> Message Delivery (all time)
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              <div>
                <p className="text-2xl font-bold">{executiveData.whatsappCounts.sent}</p>
                <p className="text-xs text-muted-foreground">Sent</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{executiveData.whatsappCounts.delivered}</p>
                <p className="text-xs text-muted-foreground">Delivered</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{executiveData.whatsappCounts.failed}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{executiveData.whatsappCounts.queued}</p>
                <p className="text-xs text-muted-foreground">Queued</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" /> AI Usage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="font-medium">{executiveData.aiUsage.totalRequests}</span> requests ·{" "}
                <span className="font-medium">{executiveData.aiUsage.totalTokens.toLocaleString()}</span> tokens
                {executiveData.aiUsage.estimatedCostUsd > 0 && <> · ~${executiveData.aiUsage.estimatedCostUsd}</>}
              </p>
              <p className="text-xs text-muted-foreground">
                {executiveData.aiUsage.failureCount} failures out of {executiveData.aiUsage.totalRequests}
              </p>
              <Link href="/admin/ai-usage" className="inline-block text-xs text-primary hover:underline">
                View full breakdown →
              </Link>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-primary" /> Automation &amp; System Health (last 24h)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4 text-sm">
            <span>
              Failed jobs: <Badge variant={executiveData.health.failedJobs24h > 0 ? "destructive" : "success"}>{executiveData.health.failedJobs24h}</Badge>
            </span>
            <span>
              Automation failures:{" "}
              <Badge variant={executiveData.health.failedAutomation24h > 0 ? "destructive" : "success"}>{executiveData.health.failedAutomation24h}</Badge>
            </span>
            <span>
              WhatsApp failures:{" "}
              <Badge variant={executiveData.health.whatsappFailures24h > 0 ? "destructive" : "success"}>{executiveData.health.whatsappFailures24h}</Badge>
            </span>
            <span>
              AI failure rate: <Badge variant={executiveData.health.aiFailureRate24h > 10 ? "destructive" : "success"}>{executiveData.health.aiFailureRate24h}%</Badge>
            </span>
            <Link href="/admin/system-health" className="text-xs text-primary hover:underline">
              View System Health →
            </Link>
          </CardContent>
        </Card>
      </DetailsToggle>

      <AnnouncementsCard announcements={announcements} />
    </div>
  );
}
