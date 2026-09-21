import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import * as studentService from "@/lib/services/students";
import * as batchService from "@/lib/services/batches";
import { PageHeader } from "@/components/shared/page-header";
import { ProgressBar } from "@/components/shared/progress-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatTime } from "@/lib/utils";
import { JoinLiveClassButton } from "@/components/shared/join-live-class-button";
import * as performanceService from "@/lib/services/performance";
import * as announcementService from "@/lib/services/announcements";
import { StatusBadge } from "@/components/shared/status-badge";
import { AnnouncementsCard } from "@/components/shared/announcements-card";
import { MyReferralCard } from "@/components/shared/my-referral-card";
import * as referralsService from "@/lib/services/referrals";
import { NextActionsCard } from "@/components/shared/next-actions-card";
import * as nextActionsService from "@/lib/services/next-actions";

export default async function StudentDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const student = await studentService.getStudentByUserId(session.user.id);
  if (!student) {
    return <EmptyState title="No student profile found" description="Ask an admin to link your account to a student profile." />;
  }

  const [todaysClasses, attendance, homework, latestPerformance, announcements, referralCode, referralStats, nextActions] = await Promise.all([
    batchService.listTodaysClassesForStudent(student.id),
    studentService.getStudentAttendance(student.id),
    studentService.getStudentHomework(student.id),
    performanceService.getLatestPerformance(student.id),
    announcementService.listAnnouncementsForUser(session.user.id, session.user.role),
    referralsService.getOrCreateReferralCode("student", student.id),
    referralsService.statsForReferrer("student", student.id),
    nextActionsService.getNextActionsForStudent(student.id),
  ]);

  const attendanceRate = studentService.computeAttendanceRate(attendance);
  const homeworkRate = studentService.computeHomeworkCompletionRate(homework);
  const pendingHomework = homework.filter((h) => h.status === "PENDING");

  return (
    <div className="space-y-6">
      <PageHeader title={`Hello, ${session.user.name.split(" ")[0]}!`} description={`${student.academicLevel.name} · What should you do next?`} />

      <NextActionsCard actions={nextActions} />

      <Card>
        <CardHeader>
          <CardTitle>Today</CardTitle>
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
                      {c.subject.name} · {c.teacher.fullName} · {formatTime(c.startTime)}
                    </p>
                  </div>
                  {c.status === "LIVE" ? (
                    <JoinLiveClassButton liveClassId={c.id} meetingLink={c.meetingLink} />
                  ) : (
                    <Badge variant="outline">{c.status === "UPCOMING" ? "Upcoming" : c.status}</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>To Do</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingHomework.length === 0 ? (
            <EmptyState title="You're all caught up!" className="py-8" />
          ) : (
            <ul className="space-y-2">
              {pendingHomework.map((h) => (
                <li key={h.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <span>
                    {h.homework.title} <span className="text-muted-foreground">· {h.homework.subject.name}</span>
                  </span>
                  <Link href="/student/homework">
                    <Badge variant="warning">Due soon</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProgressBar label="Attendance" value={attendanceRate} />
            <ProgressBar label="Homework Completion" value={homeworkRate} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Academic Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {latestPerformance ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{latestPerformance.overallScore}</p>
                  <p className="text-xs text-muted-foreground">out of 100</p>
                </div>
                <StatusBadge status={latestPerformance.category} />
              </div>
            ) : (
              <EmptyState title="Not calculated yet" description="Ask your teacher — this appears once your performance score is generated." className="py-6" />
            )}
          </CardContent>
        </Card>
      </div>

      <MyReferralCard referralCode={referralCode} stats={referralStats} />

      <AnnouncementsCard announcements={announcements} />
    </div>
  );
}
