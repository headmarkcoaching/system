import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import * as batchService from "@/lib/services/batches";
import * as studentService from "@/lib/services/students";
import * as staffService from "@/lib/services/staff";
import * as academicService from "@/lib/services/academic-structure";
import * as testService from "@/lib/services/tests";
import * as announcementService from "@/lib/services/announcements";
import { STAFF_ROLES } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CalendarCheck, Video, GraduationCap } from "lucide-react";
import { RosterTab } from "./roster-tab";
import { TeachersSubjectsPanel } from "./teachers-subjects-panel";
import { ScheduleTab } from "./schedule-tab";
import { ClassesTab } from "./classes-tab";
import { AttendanceTab } from "./attendance-tab";
import { HomeworkTab } from "./homework-tab";
import { RecordingsTab } from "./recordings-tab";
import { TestsTab } from "./tests-tab";
import { AnnouncementsTab } from "./announcements-tab";
import { LeaderboardToggle } from "./leaderboard-toggle";

export default async function BatchDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isStaff = STAFF_ROLES.includes(session.user.role);
  let canManage = isStaff;
  let viewerTeacherId: string | undefined;

  if (session.user.role === "TEACHER") {
    const teacher = await staffService.getTeacherByUserId(session.user.id);
    if (teacher) {
      viewerTeacherId = teacher.id;
      const assigned = await db.batchTeacher.findFirst({ where: { batchId: params.id, teacherId: teacher.id } });
      canManage = Boolean(assigned);
    }
  }

  if (!isStaff && !canManage) redirect(session.user.role === "TEACHER" ? "/teacher/batches" : "/admin");

  const batch = await batchService.getBatchById(params.id);
  if (!batch) notFound();

  // A batch can have several teachers, each teaching a different subject to the same shared
  // roster — a teacher should only see/manage their own subject's schedule, classes, homework,
  // tests, and recordings within it, not every other teacher's. Staff still see everything.
  // A teacher whose BatchTeacher row has no subject set (a general, unscoped assignment) keeps
  // full access — there's nothing to scope them down to.
  const teacherSubjectIds = viewerTeacherId
    ? Array.from(new Set(batch.teachers.filter((t) => t.teacherId === viewerTeacherId && t.subjectId).map((t) => t.subjectId!)))
    : [];
  const restrictToOwnSubjects = Boolean(viewerTeacherId) && teacherSubjectIds.length > 0;

  const [stats, pickerStudents, allTeachers, allSubjects, allLiveClasses, allHomeworkList, allRecordings, attendanceHistory, allTests, announcements, allTimetableEntries] =
    await Promise.all([
      batchService.batchDashboardStats(batch.id),
      studentService.listStudentsForPicker(),
      staffService.listTeachersForPicker(),
      academicService.listSubjects(),
      batchService.listLiveClassesForBatch(batch.id),
      batchService.listHomeworkForBatch(batch.id),
      batchService.listRecordingsForBatch(batch.id),
      batchService.batchAttendanceHistory(batch.id),
      testService.listTestsForBatch(batch.id),
      announcementService.listAnnouncementsForBatch(batch.id),
      batchService.listTimetable({ batchId: batch.id }),
    ]);

  const liveClasses = restrictToOwnSubjects ? allLiveClasses.filter((c) => teacherSubjectIds.includes(c.subjectId)) : allLiveClasses;
  const attendanceHistoryScoped = restrictToOwnSubjects ? attendanceHistory.filter((a) => teacherSubjectIds.includes(a.subjectId)) : attendanceHistory;
  const homeworkList = restrictToOwnSubjects ? allHomeworkList.filter((h) => teacherSubjectIds.includes(h.subjectId)) : allHomeworkList;
  const recordings = restrictToOwnSubjects ? allRecordings.filter((r) => teacherSubjectIds.includes(r.subjectId)) : allRecordings;
  const tests = restrictToOwnSubjects ? allTests.filter((t) => teacherSubjectIds.includes(t.subjectId)) : allTests;
  const timetableEntries = restrictToOwnSubjects ? allTimetableEntries.filter((e) => teacherSubjectIds.includes(e.subjectId)) : allTimetableEntries;
  // The Subject picker on every "create" form in this batch should only offer subjects the
  // viewing teacher actually teaches here — otherwise they could still create/schedule content
  // under a subject that isn't theirs, even with the lists above correctly filtered for viewing.
  const availableSubjects = restrictToOwnSubjects ? batch.subjects.filter((s) => teacherSubjectIds.includes(s.subjectId)) : batch.subjects;
  // Likewise the Teacher picker on Schedule/Classes create forms — a teacher should only be able
  // to assign themselves, not another teacher on the same shared batch.
  const availableTeachers = restrictToOwnSubjects ? batch.teachers.filter((t) => t.teacherId === viewerTeacherId) : batch.teachers;

  const existingAttendance = attendanceHistoryScoped.map((a) => ({ studentId: a.studentId, liveClassId: a.liveClassId, status: a.status }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={batch.name}
        description={`${batch.academicLevel.name}${batch.board ? ` · ${batch.board.name}` : ""}${batch.group ? ` · ${batch.group.name}` : ""}`}
        actions={
          <>
            <StatusBadge status={batch.status} />
            {isStaff && <LeaderboardToggle batchId={batch.id} initialEnabled={batch.leaderboardEnabled} />}
            {isStaff && (
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/batches">Back to Batches</Link>
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Students" value={`${stats.studentCount} / ${batch.maxStudents}`} icon={Users} />
        <StatCard label="Attendance Rate" value={`${stats.attendanceRate}%`} icon={CalendarCheck} tone={stats.attendanceRate >= 75 ? "success" : "warning"} />
        <StatCard label="Teachers" value={batch.teachers.length} icon={GraduationCap} />
        <StatCard label="Upcoming Class" value={stats.upcomingClass ? stats.upcomingClass.title : "—"} icon={Video} />
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="homework">Homework</TabsTrigger>
          <TabsTrigger value="tests">Tests</TabsTrigger>
          <TabsTrigger value="recordings">Recordings</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-6">
          {isStaff && <TeachersSubjectsPanel batchId={batch.id} teachers={batch.teachers} subjects={batch.subjects} allTeachers={allTeachers} allSubjects={allSubjects} canManage={isStaff} />}
          <RosterTab batchId={batch.id} students={batch.students} pickerStudents={pickerStudents} canManage={canManage} />
        </TabsContent>

        <TabsContent value="schedule">
          <ScheduleTab
            batchId={batch.id}
            entries={timetableEntries}
            subjects={availableSubjects.map((s) => s.subject)}
            teachers={availableTeachers.map((t) => t.teacher)}
            canManage={canManage}
          />
        </TabsContent>

        <TabsContent value="classes">
          <ClassesTab batchId={batch.id} classes={liveClasses} subjects={availableSubjects.map((s) => s.subject)} teachers={availableTeachers.map((t) => t.teacher)} canManage={canManage} />
        </TabsContent>

        <TabsContent value="attendance">
          <AttendanceTab
            batchId={batch.id}
            classes={liveClasses.map((c) => ({ id: c.id, title: c.title, scheduledDate: c.scheduledDate, subjectId: c.subject.id }))}
            students={batch.students.map((s) => ({ id: s.studentId, fullName: s.student.fullName }))}
            existingAttendance={existingAttendance}
            history={attendanceHistoryScoped}
            canManage={canManage}
          />
        </TabsContent>

        <TabsContent value="homework">
          <HomeworkTab batchId={batch.id} homeworkList={homeworkList} subjects={availableSubjects.map((s) => s.subject)} canManage={canManage} />
        </TabsContent>

        <TabsContent value="tests">
          <TestsTab batchId={batch.id} academicLevelId={batch.academicLevelId} tests={tests} subjects={availableSubjects.map((s) => s.subject)} canManage={canManage} />
        </TabsContent>

        <TabsContent value="recordings">
          <RecordingsTab batchId={batch.id} recordings={recordings} subjects={availableSubjects.map((s) => s.subject)} liveClasses={liveClasses} canManage={canManage} />
        </TabsContent>

        <TabsContent value="announcements">
          <AnnouncementsTab batchId={batch.id} announcements={announcements} canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
