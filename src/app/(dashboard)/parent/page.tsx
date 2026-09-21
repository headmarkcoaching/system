import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as parentService from "@/lib/services/parents";
import * as studentService from "@/lib/services/students";
import * as batchService from "@/lib/services/batches";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime } from "@/lib/utils";
import { CalendarCheck, ClipboardList, ExternalLink } from "lucide-react";
import { ChildSwitcher } from "./child-switcher";
import * as performanceService from "@/lib/services/performance";
import * as paymentsService from "@/lib/services/payments";
import * as testService from "@/lib/services/tests";
import * as parentReportService from "@/lib/services/parent-reports";
import * as announcementService from "@/lib/services/announcements";
import { AnnouncementsCard } from "@/components/shared/announcements-card";
import { MyReferralCard } from "@/components/shared/my-referral-card";
import * as referralsService from "@/lib/services/referrals";
import { NextActionsCard } from "@/components/shared/next-actions-card";
import * as nextActionsService from "@/lib/services/next-actions";
import { DetailsToggle } from "@/components/shared/details-toggle";
import { AllChildrenStrip, type ChildSummary } from "./all-children-strip";
import { WeeklySummaryCard } from "./weekly-summary-card";
import { MonthlyFeeBanner } from "./monthly-fee-banner";
import { ParentReportItem } from "./report-item";

export default async function ParentDashboardPage({ searchParams }: { searchParams: { child?: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const parent = await parentService.getChildrenForParentUser(session.user.id);
  if (!parent || parent.children.length === 0) {
    return <EmptyState title="No children linked to your account yet" description="Contact the academy to link your child's profile." />;
  }

  const selected = parent.children.find((c) => c.studentId === searchParams.child) ?? parent.children[0];
  const student = selected.student;

  const childrenSummaries: ChildSummary[] = await Promise.all(
    parent.children.map(async (c) => {
      const [att, perf] = await Promise.all([studentService.getStudentAttendance(c.studentId), performanceService.getLatestPerformance(c.studentId)]);
      return {
        studentId: c.studentId,
        fullName: c.student.fullName,
        levelName: c.student.academicLevel.name,
        attendanceRate: studentService.computeAttendanceRate(att),
        performanceCategory: perf?.category ?? null,
      };
    })
  );

  const [attendance, homework, todaysClasses, latestPerformance, paymentPlan, testResults, parentReports, announcements, referralCode, referralStats, nextActions, currentMonthFee] = await Promise.all([
    studentService.getStudentAttendance(student.id),
    studentService.getStudentHomework(student.id),
    batchService.listTodaysClassesForStudent(student.id),
    performanceService.getLatestPerformance(student.id),
    paymentsService.listPaymentPlanForStudent(student.id),
    testService.listTestsForStudent(student.id),
    parentReportService.listForStudent(student.id),
    announcementService.listAnnouncementsForUser(session.user.id, session.user.role),
    referralsService.getOrCreateReferralCode("parent", parent.id),
    referralsService.statsForReferrer("parent", parent.id),
    nextActionsService.getNextActionsForStudent(student.id),
    paymentsService.getCurrentMonthPaymentStatus(student.id),
  ]);

  const attendanceRate = studentService.computeAttendanceRate(attendance);
  const homeworkRate = studentService.computeHomeworkCompletionRate(homework);
  const fallbackStatus = attendanceRate >= 85 && homeworkRate >= 85 ? "Excellent" : attendanceRate >= 60 && homeworkRate >= 60 ? "Progressing" : "Needs Attention";
  const overallStatus = latestPerformance
    ? latestPerformance.category.charAt(0) + latestPerformance.category.slice(1).toLowerCase().replace("_", " ")
    : fallbackStatus;

  const outstandingBalance = paymentPlan
    ? Number(paymentPlan.totalFee) - paymentPlan.payments.filter((p) => p.status === "PAID").reduce((sum, p) => sum + Number(p.amount), 0)
    : null;
  const overdueInstallment = paymentPlan?.installments.find((i) => i.status !== "PAID" && i.dueDate < new Date());

  const completedTests = testResults.filter((t) => t.result?.gradedAt);

  const statusTone = latestPerformance
    ? latestPerformance.category === "EXCELLENT"
      ? "success"
      : latestPerformance.category === "AT_RISK"
        ? "destructive"
        : latestPerformance.category === "NEEDS_ATTENTION"
          ? "warning"
          : "default"
    : fallbackStatus === "Excellent"
      ? "success"
      : fallbackStatus === "Progressing"
        ? "default"
        : "warning";

  const latestReport = parentReports[0] ?? null;
  const nextSteps = latestReport?.nextWeekGoal ?? nextActions[0]?.title ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader title={student.fullName} description={student.academicLevel.name} className="flex-1" />
        <ChildSwitcher options={parent.children.map((c) => ({ id: c.studentId, fullName: c.student.fullName }))} selectedId={student.id} />
      </div>

      <AllChildrenStrip childrenSummaries={childrenSummaries} selectedId={student.id} />

      <MonthlyFeeBanner status={currentMonthFee} />

      <WeeklySummaryCard
        attendanceRate={attendanceRate}
        homeworkRate={homeworkRate}
        overallStatus={overallStatus}
        statusTone={statusTone}
        teacherFeedback={latestReport?.teacherFeedback ?? null}
        nextSteps={nextSteps}
      />

      <NextActionsCard title="What Needs Attention" actions={nextActions} />

      <DetailsToggle label="Show More Details">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Attendance (Week)" value={`${attendanceRate}%`} icon={CalendarCheck} tone={attendanceRate >= 75 ? "success" : "warning"} />
          <StatCard label="Homework Completion" value={`${homeworkRate}%`} icon={ClipboardList} tone={homeworkRate >= 75 ? "success" : "warning"} />
          <StatCard label="Overall Status" value={overallStatus} tone={statusTone} />
          <StatCard
            label="Payment Status"
            value={!paymentPlan ? "—" : outstandingBalance && outstandingBalance > 0 ? (overdueInstallment ? "Overdue" : "Balance Due") : "Paid Up"}
            tone={!paymentPlan ? "default" : overdueInstallment ? "destructive" : outstandingBalance && outstandingBalance > 0 ? "warning" : "success"}
            hint={!paymentPlan ? "No plan set up" : undefined}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Classes</CardTitle>
          </CardHeader>
          <CardContent>
            {todaysClasses.length === 0 ? (
              <EmptyState title="No classes today" className="py-6" />
            ) : (
              <ul className="space-y-2">
                {todaysClasses.map((c) => (
                  <li key={c.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <span>
                      {c.title} · {c.subject.name} · {formatTime(c.startTime)}
                    </span>
                    <Badge variant="outline">{c.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Homework</CardTitle>
          </CardHeader>
          <CardContent>
            {homework.length === 0 ? (
              <EmptyState title="No homework yet" className="py-6" />
            ) : (
              <ul className="space-y-2">
                {homework.slice(0, 5).map((h) => (
                  <li key={h.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                    <span>
                      {h.homework.title} <span className="text-muted-foreground">· Due {formatDate(h.homework.dueDate)}</span>
                    </span>
                    <Badge variant="outline">{h.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            {completedTests.length === 0 ? (
              <EmptyState title="No graded tests yet" className="py-6" />
            ) : (
              <ul className="space-y-2">
                {completedTests.slice(0, 5).map((t) => {
                  const percent = Math.round((t.result!.marksObtained / t.result!.totalMarks) * 100);
                  return (
                    <li key={t.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                      <span>
                        {t.name} <span className="text-muted-foreground">· {t.subject.name}</span>
                      </span>
                      <Badge variant={percent >= 40 ? "success" : "destructive"}>
                        {t.result!.marksObtained}/{t.result!.totalMarks} ({percent}%)
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild variant="outline">
            <Link href={`/students/${student.id}`}>
              View Full Profile <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Parent Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {parentReports.length === 0 ? (
              <EmptyState title="No reports generated yet" description="Your academy will share a report here after it's generated." className="py-6" />
            ) : (
              <ul className="space-y-3">
                {parentReports.slice(0, 3).map((r) => (
                  <ParentReportItem key={r.id} report={r} />
                ))}
              </ul>
            )}
        </CardContent>
      </Card>

        <MyReferralCard referralCode={referralCode} stats={referralStats} />
      </DetailsToggle>

      <AnnouncementsCard announcements={announcements} />
    </div>
  );
}
