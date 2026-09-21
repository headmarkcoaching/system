import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import * as studentService from "@/lib/services/students";
import * as parentService from "@/lib/services/parents";
import * as testService from "@/lib/services/tests";
import * as performanceService from "@/lib/services/performance";
import * as paymentsService from "@/lib/services/payments";
import * as parentReportService from "@/lib/services/parent-reports";
import * as communicationService from "@/lib/services/communication";
import * as engagementService from "@/lib/services/engagement";
import * as gamificationService from "@/lib/services/gamification";
import * as interventionsService from "@/lib/services/interventions";
import * as staffService from "@/lib/services/staff";
import * as performanceAnalysisService from "@/lib/services/performance-analysis";
import * as learningAnalyticsService from "@/lib/services/learning-analytics";
import * as riskService from "@/lib/services/predictive-risk";
import * as goalsService from "@/lib/services/goals";
import * as recordingAccessService from "@/lib/services/recording-access";
import { isDirectVideoUrl } from "@/lib/services/content-progress";
import { STAFF_ROLES, ACADEMIC_STAFF_ROLES } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { ProgressBar } from "@/components/shared/progress-bar";
import { PhotoUploadAvatar } from "@/components/shared/photo-upload-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { formatDate, formatTime, initials } from "@/lib/utils";
import { CalendarCheck, ClipboardList, TrendingUp, Sparkles } from "lucide-react";
import { LinkParentDialog } from "./link-parent-dialog";
import { uploadStudentPhotoAction } from "./profile-actions";
import { NotesTab } from "./notes-tab";
import { TestsTab as StudentTestsTab } from "./tests-tab";
import { PerformanceTab } from "./performance-tab";
import { PaymentsTab } from "./payments-tab";
import { ParentReportsTab } from "./parent-reports-tab";
import { CommunicationTab } from "./communication-tab";
import { EngagementTab } from "./engagement-tab";
import { RecordingItem } from "@/app/(dashboard)/student/recordings/recording-item";

async function canView(studentId: string) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const role = session.user.role;

  if (STAFF_ROLES.includes(role)) return session;

  if (role === "STUDENT") {
    const student = await db.student.findUnique({ where: { id: studentId }, select: { userId: true } });
    if (student?.userId === session.user.id) return session;
  }

  if (role === "TEACHER") {
    const teacher = await db.teacher.findUnique({ where: { userId: session.user.id } });
    if (teacher) {
      const shared = await db.batchStudent.findFirst({
        where: { studentId, batch: { teachers: { some: { teacherId: teacher.id } } } },
      });
      if (shared) return session;
    }
  }

  if (role === "PARENT") {
    const parent = await db.parent.findUnique({ where: { userId: session.user.id } });
    if (parent) {
      const link = await db.studentParentRelationship.findFirst({ where: { studentId, parentId: parent.id } });
      if (link) return session;
    }
  }

  redirect(session ? `/${role.toLowerCase() === "super_admin" ? "admin" : role.toLowerCase()}` : "/login");
}

const VALID_TABS = new Set([
  "overview",
  "attendance",
  "homework",
  "tests",
  "recordings",
  "material",
  "payments",
  "performance",
  "reports",
  "communication",
  "engagement",
  "notes",
]);

export default async function StudentProfilePage({ params, searchParams }: { params: { id: string }; searchParams: { tab?: string } }) {
  const initialTab = searchParams.tab && VALID_TABS.has(searchParams.tab) ? searchParams.tab : "overview";
  const session = await canView(params.id);
  const isStaff = STAFF_ROLES.includes(session.user.role);
  const canManagePerformance = ACADEMIC_STAFF_ROLES.includes(session.user.role);
  // Recordings tab: staff/teacher keep full unrestricted oversight (same as the batch-level
  // Recordings tab); the student sees the exact same request/48h-unlock gating as their own
  // /student/recordings page (this profile is not a side door around that); a parent doesn't
  // get recordings here at all.
  const canSeeAllRecordings = isStaff || session.user.role === "TEACHER";
  const isOwnStudentViewer = session.user.role === "STUDENT";
  const isParentViewer = session.user.role === "PARENT";

  const student = await studentService.getStudentById(params.id);
  if (!student) notFound();
  const batch = student.batchMemberships[0]?.batch;
  const canEditPhoto = isStaff || (session.user.role === "STUDENT" && student.userId === session.user.id);

  const [
    attendance,
    homework,
    classes,
    recordings,
    material,
    notes,
    allParents,
    tests,
    latestPerformance,
    performanceHistory,
    paymentPlan,
    parentReports,
    communicationLogs,
    latestEngagement,
    pointsTotal,
    pointsHistory,
    badges,
    interventions,
    staffOptions,
    latestAnalysis,
    learningAnalytics,
    latestRisk,
    goals,
    goalSubjects,
  ] = await Promise.all([
    studentService.getStudentAttendance(student.id),
    studentService.getStudentHomework(student.id),
    studentService.getStudentClasses(student.id),
    studentService.getStudentRecordings(student.id),
    studentService.getStudentStudyMaterial(student.id),
    studentService.listStudentNotes(student.id),
    isStaff ? parentService.listParentsForPicker() : Promise.resolve([]),
    testService.listTestsForStudent(student.id),
    performanceService.getLatestPerformance(student.id),
    performanceService.getPerformanceHistory(student.id),
    paymentsService.listPaymentPlanForStudent(student.id),
    parentReportService.listForStudent(student.id),
    communicationService.listForStudent(student.id),
    engagementService.getLatestEngagementScore(student.id),
    gamificationService.getStudentPointsTotal(student.id),
    gamificationService.listPointsHistory(student.id),
    gamificationService.listBadgesForStudent(student.id),
    interventionsService.listForStudent(student.id),
    isStaff ? staffService.listStaffForPicker() : Promise.resolve([]),
    performanceAnalysisService.getLatestPerformanceAnalysis(student.id),
    learningAnalyticsService.getStudentLearningAnalytics(student.id),
    riskService.getLatestRiskScore(student.id),
    goalsService.listGoalsForStudent(student.id),
    studentService.listSubjectsForStudent(student.id),
  ]);

  const attendanceRate = studentService.computeAttendanceRate(attendance);
  const homeworkRate = studentService.computeHomeworkCompletionRate(homework);
  const testAverage = await testService.getStudentAverageTestScore(student.id);
  const recordingAccessMap = isOwnStudentViewer ? await recordingAccessService.getRecordingAccessMap(student.id, recordings) : null;

  // Classes and Attendance used to be two near-identical per-class-session tables (same
  // date/subject/class columns, just a different status column) — merged into one: every
  // scheduled class, with its attendance status once one exists, falling back to the class's
  // own lifecycle status (Upcoming/Live/Cancelled) for classes that haven't happened yet.
  const attendanceByLiveClass = new Map(attendance.map((a) => [a.liveClassId, a]));
  const classHistoryRows = classes.map((c) => ({
    id: c.id,
    title: c.title,
    subject: c.subject,
    teacher: c.teacher,
    scheduledDate: c.scheduledDate,
    startTime: c.startTime,
    classStatus: c.status,
    attendance: attendanceByLiveClass.get(c.id) ?? null,
  }));

  const classHistoryColumns: DataTableColumn<(typeof classHistoryRows)[number]>[] = [
    { key: "date", header: "Date", cell: (r) => `${formatDate(r.scheduledDate)} · ${formatTime(r.startTime)}` },
    { key: "subject", header: "Subject", cell: (r) => r.subject.name },
    { key: "class", header: "Class", cell: (r) => r.title },
    { key: "teacher", header: "Teacher", cell: (r) => r.teacher.fullName, hideOnMobile: true },
    {
      key: "status",
      header: "Status",
      cell: (r) =>
        r.attendance ? (
          <div className="flex items-center gap-2">
            <StatusBadge status={r.attendance.status} />
            {r.attendance.isAutoDetected && (
              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground" title="Estimated from tab activity, not manually verified">
                Auto (estimated)
              </span>
            )}
          </div>
        ) : (
          <StatusBadge status={r.classStatus} />
        ),
    },
  ];

  const homeworkColumns: DataTableColumn<(typeof homework)[number]>[] = [
    { key: "title", header: "Homework", cell: (r) => r.homework.title },
    { key: "subject", header: "Subject", cell: (r) => r.homework.subject.name },
    { key: "due", header: "Due", cell: (r) => formatDate(r.homework.dueDate) },
    { key: "marks", header: "Marks", cell: (r) => (r.marksObtained != null ? `${r.marksObtained}/${r.homework.maxMarks ?? "-"}` : "—") },
    { key: "status", header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  ];

  const recordingColumns: DataTableColumn<(typeof recordings)[number]>[] = [
    { key: "title", header: "Recording", cell: (r) => r.title },
    { key: "subject", header: "Subject", cell: (r) => r.subject.name },
    { key: "date", header: "Date", cell: (r) => formatDate(r.recordingDate) },
    {
      key: "link",
      header: "",
      cell: (r) => (
        <a href={r.recordingUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Watch
        </a>
      ),
    },
  ];

  const materialColumns: DataTableColumn<(typeof material)[number]>[] = [
    { key: "title", header: "Material", cell: (r) => r.title },
    { key: "subject", header: "Subject", cell: (r) => r.subject.name },
    { key: "chapter", header: "Chapter", cell: (r) => r.chapter ?? "—" },
    {
      key: "link",
      header: "",
      cell: (r) => (
        <a href={r.fileId ? `/api/files/${r.fileId}` : (r.fileUrl ?? "#")} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Open
        </a>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <PhotoUploadAvatar
            photoUrl={student.photoUrl}
            fallbackText={initials(student.fullName)}
            size="h-16 w-16"
            editable={canEditPhoto}
            onUpload={uploadStudentPhotoAction.bind(null, student.id)}
          />
          <div>
            <h1 className="text-xl font-bold">{student.fullName}</h1>
            <p className="text-sm text-muted-foreground">{student.studentCode}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{student.academicLevel.name}</Badge>
              {batch && <Badge variant="outline">{batch.name}</Badge>}
              <StatusBadge status={student.status} />
            </div>
          </div>
        </div>
        {isStaff && (
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/students">Back to Students</Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Attendance" value={`${attendanceRate}%`} icon={CalendarCheck} tone={attendanceRate >= 75 ? "success" : attendanceRate >= 50 ? "warning" : "destructive"} />
        <StatCard label="Homework Completion" value={`${homeworkRate}%`} icon={ClipboardList} tone={homeworkRate >= 75 ? "success" : homeworkRate >= 50 ? "warning" : "destructive"} />
        <StatCard label="Test Average" value={testAverage != null ? `${testAverage}%` : "—"} icon={TrendingUp} hint={testAverage == null ? "No graded tests yet" : undefined} />
        <StatCard
          label="Performance Score"
          value={latestPerformance ? latestPerformance.overallScore : "—"}
          icon={Sparkles}
          hint={latestPerformance ? undefined : "Not calculated yet"}
          tone={latestPerformance?.category === "AT_RISK" ? "destructive" : latestPerformance?.category === "EXCELLENT" ? "success" : "default"}
        />
      </div>

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="homework">Homework</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
          {!isParentViewer && <TabsTrigger value="recordings">Recordings</TabsTrigger>}
          {!isParentViewer && <TabsTrigger value="material">Study Material</TabsTrigger>}
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="reports">Parent Reports</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          {isStaff && <TabsTrigger value="notes">Internal Notes</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border border-border p-4">
              <h3 className="font-semibold">Contact Details</h3>
              <dl className="space-y-1.5 text-sm">
                <Row label="Phone" value={student.phone} />
                <Row label="WhatsApp" value={student.whatsapp} />
                <Row label="Email" value={student.email} />
                <Row label="City" value={student.city} />
                <Row label="Address" value={student.address} />
                <Row label="School" value={student.school} />
                <Row label="Board" value={student.board?.name} />
                <Row label="Group" value={student.group?.name} />
                <Row label="Enrolled" value={student.enrollmentDate ? formatDate(student.enrollmentDate) : undefined} />
              </dl>
            </div>
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Parents / Guardians</h3>
                {isStaff && <LinkParentDialog studentId={student.id} parents={allParents} />}
              </div>
              {student.parents.length === 0 ? (
                <EmptyState title="No parent linked yet" className="py-6" />
              ) : (
                <ul className="space-y-2">
                  {student.parents.map((rel) => (
                    <li key={rel.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                      <div>
                        <Link href={`/parents/${rel.parentId}`} className="font-medium hover:underline">
                          {rel.parent.fullName}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {rel.relationship} {rel.isPrimary && "· Primary"} · {rel.parent.phone}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <ProgressBar label="Attendance" value={attendanceRate} />
            <ProgressBar label="Homework Completion" value={homeworkRate} />
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <DataTable columns={classHistoryColumns} data={classHistoryRows} rowKey={(r) => r.id} emptyTitle="No classes scheduled yet" />
        </TabsContent>

        <TabsContent value="homework">
          <DataTable columns={homeworkColumns} data={homework} rowKey={(r) => r.id} emptyTitle="No homework assigned yet" />
        </TabsContent>

        <TabsContent value="tests">
          <StudentTestsTab tests={tests} />
        </TabsContent>

        {!isParentViewer && (
          <TabsContent value="recordings">
            {canSeeAllRecordings ? (
              <DataTable columns={recordingColumns} data={recordings} rowKey={(r) => r.id} emptyTitle="No recordings available yet" />
            ) : recordings.length === 0 ? (
              <EmptyState title="No recordings available yet" />
            ) : (
              <ul className="space-y-2">
                {recordings.map((r) => (
                  <RecordingItem
                    key={r.id}
                    recording={{
                      id: r.id,
                      title: r.title,
                      recordingDate: r.recordingDate,
                      recordingUrl: r.recordingUrl,
                      isDirectVideo: isDirectVideoUrl(r.recordingUrl),
                      progress: null,
                      access: recordingAccessMap?.get(r.id) ?? { isLinked: false, eligible: false, activeUntil: null },
                    }}
                  />
                ))}
              </ul>
            )}
          </TabsContent>
        )}

        {!isParentViewer && (
          <TabsContent value="material">
            <DataTable columns={materialColumns} data={material} rowKey={(r) => r.id} emptyTitle="No study material for this level yet" />
          </TabsContent>
        )}

        <TabsContent value="payments">
          <PaymentsTab studentId={student.id} plan={paymentPlan} canManage={isStaff} />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceTab
            studentId={student.id}
            batchId={batch?.id ?? null}
            latest={latestPerformance}
            history={performanceHistory}
            canManage={canManagePerformance}
            canGenerateAnalysis={canManagePerformance || session.user.role === "STUDENT"}
            initialAnalysis={latestAnalysis ? { analysis: latestAnalysis.response ?? "", generatedAt: latestAnalysis.createdAt } : null}
            learningAnalytics={learningAnalytics}
            goals={goals}
            goalSubjects={goalSubjects}
          />
        </TabsContent>

        <TabsContent value="reports">
          <ParentReportsTab studentId={student.id} reports={parentReports} canManage={canManagePerformance} />
        </TabsContent>

        <TabsContent value="communication">
          <CommunicationTab studentId={student.id} logs={communicationLogs} canManage={isStaff} />
        </TabsContent>

        <TabsContent value="engagement">
          <EngagementTab
            studentId={student.id}
            latestScore={latestEngagement}
            pointsTotal={pointsTotal}
            pointsHistory={pointsHistory}
            badges={badges}
            interventions={interventions}
            staffOptions={staffOptions}
            latestRisk={latestRisk ? { score: latestRisk.score, riskLevel: latestRisk.riskLevel, signals: latestRisk.signals as string[], calculatedAt: latestRisk.calculatedAt } : null}
            canManage={isStaff}
          />
        </TabsContent>

        {isStaff && (
          <TabsContent value="notes">
            <NotesTab studentId={student.id} notes={notes} canAdd={isStaff} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value || "—"}</dd>
    </div>
  );
}
