import { PrismaClient, type RoleKey, type StudentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const DEFAULT_PASSWORD = "password123";

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log("Seeding Parent-First Online Academy…");

  // ---- Roles & Permissions ----
  const roleDefs: { key: RoleKey; name: string; description: string }[] = [
    { key: "SUPER_ADMIN", name: "Super Admin", description: "Full access to everything in the academy." },
    { key: "ADMIN", name: "Admin / Operations", description: "Manages day-to-day academy operations." },
    { key: "TEACHER", name: "Teacher", description: "Manages assigned batches, students and subjects." },
    { key: "STUDENT", name: "Student", description: "Accesses classes, homework, tests and results." },
    { key: "PARENT", name: "Parent", description: "Views linked children's progress and payments." },
    { key: "COUNSELOR", name: "Admission Counselor", description: "Manages leads and the admissions pipeline." },
  ];

  const roles = new Map<RoleKey, { id: string }>();
  for (const r of roleDefs) {
    const role = await db.role.upsert({ where: { key: r.key }, update: { name: r.name, description: r.description }, create: r });
    roles.set(r.key, role);
  }

  const permissionDefs = [
    { code: "students.manage", module: "students", description: "Create, edit and view students" },
    { code: "parents.manage", module: "parents", description: "Create, edit and view parents" },
    { code: "batches.manage", module: "batches", description: "Create, edit and view batches" },
    { code: "attendance.mark", module: "attendance", description: "Mark and view attendance" },
    { code: "homework.manage", module: "homework", description: "Create and grade homework" },
    { code: "users.manage", module: "settings", description: "Create and manage staff users" },
  ];
  const permissions = [];
  for (const p of permissionDefs) {
    permissions.push(await db.permission.upsert({ where: { code: p.code }, update: p, create: p }));
  }

  const rolePermissionMap: Record<RoleKey, string[]> = {
    SUPER_ADMIN: permissionDefs.map((p) => p.code),
    ADMIN: ["students.manage", "parents.manage", "batches.manage", "attendance.mark", "homework.manage"],
    TEACHER: ["attendance.mark", "homework.manage"],
    STUDENT: [],
    PARENT: [],
    COUNSELOR: [],
  };
  for (const [roleKey, codes] of Object.entries(rolePermissionMap)) {
    const role = roles.get(roleKey as RoleKey)!;
    for (const code of codes) {
      const permission = permissions.find((p) => p.code === code)!;
      await db.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  // ---- Performance config (singleton) ----
  await db.performanceConfig.upsert({ where: { id: "singleton" }, update: {}, create: { id: "singleton" } });

  // ---- Academic structure ----
  const levelDefs = [
    { name: "Class 8", sortOrder: 1 },
    { name: "Class 9", sortOrder: 2 },
    { name: "Class 10", sortOrder: 3 },
    { name: "1st Year", sortOrder: 4 },
    { name: "2nd Year", sortOrder: 5 },
  ];
  const levels = [];
  for (const l of levelDefs) {
    levels.push(await db.academicLevel.upsert({ where: { name: l.name }, update: {}, create: l }));
  }
  const [class8, class9, class10, firstYear, secondYear] = levels;

  const boardDefs = ["Punjab Board", "Federal Board", "Sindh Board", "KPK Board"];
  const boards = [];
  for (const name of boardDefs) boards.push(await db.board.upsert({ where: { name }, update: {}, create: { name } }));

  const groupDefs: { name: string; type: "PRE_MEDICAL" | "PRE_ENGINEERING" | "ICS" | "ICOM" | "FA" | "OTHER" }[] = [
    { name: "Pre-Medical", type: "PRE_MEDICAL" },
    { name: "Pre-Engineering", type: "PRE_ENGINEERING" },
    { name: "ICS", type: "ICS" },
    { name: "I.Com", type: "ICOM" },
    { name: "FA", type: "FA" },
  ];
  const groups = [];
  for (const g of groupDefs) groups.push(await db.group.upsert({ where: { name: g.name }, update: {}, create: g }));

  const programDefs = [
    { name: "Companion Care", description: "Hourly group coaching support" },
    { name: "Safe at Home", description: "Full academic year coaching package" },
    { name: "Total Care Management", description: "Comprehensive coaching with weekly check-ins" },
    { name: "Hospital Transition", description: "Short-term intensive catch-up program" },
  ];
  const programs = [];
  for (const p of programDefs) programs.push(await db.program.upsert({ where: { name: p.name }, update: {}, create: p }));

  const subjectNames = ["English", "Urdu", "Mathematics", "Physics", "Chemistry", "Biology", "Computer Science", "Islamiyat", "Pakistan Studies"];
  const subjects: Awaited<ReturnType<typeof db.subject.create>>[] = [];
  for (const name of subjectNames) {
    const existing = await db.subject.findFirst({ where: { name, academicLevelId: null } });
    subjects.push(existing ?? (await db.subject.create({ data: { name } })));
  }
  const byName = (name: string) => subjects.find((s) => s.name === name)!;

  // ---- Staff users ----
  const passwordHash = await hash(DEFAULT_PASSWORD);

  const superAdmin = await db.user.upsert({
    where: { email: "owner@parentfirst.pk" },
    update: {},
    create: { name: "Ayesha Khan", email: "owner@parentfirst.pk", phone: "03001234567", passwordHash, roleId: roles.get("SUPER_ADMIN")!.id, roleKey: "SUPER_ADMIN" },
  });

  await db.user.upsert({
    where: { email: "admin@parentfirst.pk" },
    update: {},
    create: { name: "Bilal Ahmed", email: "admin@parentfirst.pk", phone: "03001234568", passwordHash, roleId: roles.get("ADMIN")!.id, roleKey: "ADMIN" },
  });

  const teacherDefs = [
    { name: "Sir Usman Tariq", email: "usman.tariq@parentfirst.pk", phone: "03011234561", subject: "Mathematics" },
    { name: "Miss Sana Malik", email: "sana.malik@parentfirst.pk", phone: "03011234562", subject: "Physics" },
    { name: "Sir Hamza Sheikh", email: "hamza.sheikh@parentfirst.pk", phone: "03011234563", subject: "Chemistry" },
    { name: "Miss Fatima Raza", email: "fatima.raza@parentfirst.pk", phone: "03011234564", subject: "English" },
  ];
  const teachers = [];
  for (const t of teacherDefs) {
    const user = await db.user.upsert({
      where: { email: t.email },
      update: {},
      create: { name: t.name, email: t.email, phone: t.phone, passwordHash, roleId: roles.get("TEACHER")!.id, roleKey: "TEACHER" },
    });
    const teacher = await db.teacher.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, fullName: t.name, email: t.email, phone: t.phone },
    });
    teachers.push({ ...teacher, mainSubject: byName(t.subject) });
  }

  const counselorUser = await db.user.upsert({
    where: { email: "counselor@parentfirst.pk" },
    update: {},
    create: { name: "Zainab Siddiqui", email: "counselor@parentfirst.pk", phone: "03021234561", passwordHash, roleId: roles.get("COUNSELOR")!.id, roleKey: "COUNSELOR" },
  });
  const counselor = await db.counselor.upsert({
    where: { userId: counselorUser.id },
    update: {},
    create: { userId: counselorUser.id, fullName: "Zainab Siddiqui", email: "counselor@parentfirst.pk", phone: "03021234561" },
  });

  // ---- Batches ----
  const batchDefs = [
    { name: "Class 10 Punjab Board Evening A", level: class10, board: boards[0], group: undefined, program: programs[1], teacherIdx: [0, 1, 2, 3] },
    { name: "Class 9 Federal Board Morning A", level: class9, board: boards[1], group: undefined, program: programs[1], teacherIdx: [0, 3] },
    { name: "Class 8 Punjab Board Evening B", level: class8, board: boards[0], group: undefined, program: programs[0], teacherIdx: [3] },
    { name: "1st Year Pre-Medical Evening A", level: firstYear, board: boards[0], group: groups[0], program: programs[2], teacherIdx: [1, 2, 3] },
    { name: "2nd Year Pre-Engineering Evening A", level: secondYear, board: boards[0], group: groups[1], program: programs[2], teacherIdx: [0, 1] },
  ];

  const batches = [];
  for (const b of batchDefs) {
    const existing = await db.batch.findFirst({ where: { name: b.name } });
    const batch =
      existing ??
      (await db.batch.create({
        data: {
          name: b.name,
          academicLevelId: b.level.id,
          boardId: b.board?.id,
          groupId: b.group?.id,
          programId: b.program.id,
          maxStudents: 30,
          startDate: new Date("2026-01-15"),
          status: "ACTIVE",
          createdById: superAdmin.id,
        },
      }));
    batches.push({ ...batch, teacherIdx: b.teacherIdx, level: b.level });
  }

  const batchSubjectNames: Record<string, string[]> = {
    "Class 10 Punjab Board Evening A": ["Mathematics", "Physics", "Chemistry", "English"],
    "Class 9 Federal Board Morning A": ["Mathematics", "English", "Urdu"],
    "Class 8 Punjab Board Evening B": ["English", "Mathematics"],
    "1st Year Pre-Medical Evening A": ["Physics", "Chemistry", "Biology", "English"],
    "2nd Year Pre-Engineering Evening A": ["Mathematics", "Physics", "Computer Science"],
  };

  for (const batch of batches) {
    for (const subjectName of batchSubjectNames[batch.name] ?? []) {
      const subject = byName(subjectName);
      const exists = await db.batchSubject.findFirst({ where: { batchId: batch.id, subjectId: subject.id } });
      if (!exists) await db.batchSubject.create({ data: { batchId: batch.id, subjectId: subject.id } });
    }
    for (const idx of batch.teacherIdx) {
      const teacher = teachers[idx];
      const exists = await db.batchTeacher.findFirst({ where: { batchId: batch.id, teacherId: teacher.id, subjectId: teacher.mainSubject.id } });
      if (!exists) await db.batchTeacher.create({ data: { batchId: batch.id, teacherId: teacher.id, subjectId: teacher.mainSubject.id } });
    }
  }

  // ---- Timetable ----
  const days = ["MONDAY", "WEDNESDAY"] as const;
  for (const batch of batches) {
    const batchTeachers = await db.batchTeacher.findMany({ where: { batchId: batch.id }, include: { teacher: true, subject: true } });
    let hour = 16;
    for (const bt of batchTeachers) {
      if (!bt.subjectId) continue;
      for (const day of days) {
        const exists = await db.timetable.findFirst({ where: { batchId: batch.id, subjectId: bt.subjectId, dayOfWeek: day } });
        if (!exists) {
          await db.timetable.create({
            data: {
              batchId: batch.id,
              subjectId: bt.subjectId,
              teacherId: bt.teacherId,
              dayOfWeek: day,
              startTime: `${hour}:00`,
              endTime: `${hour + 1}:00`,
            },
          });
        }
      }
      hour += 1;
    }
  }

  // ---- Students & Parents ----
  const firstNames = ["Ahmed", "Ali", "Hamza", "Bilal", "Usman", "Zain", "Hassan", "Umar", "Sara", "Ayesha", "Fatima", "Zainab", "Mariam", "Hira", "Amna", "Sana", "Noor", "Iqra", "Rida", "Laiba", "Faizan", "Talha", "Danish", "Saad", "Rafay"];
  const lastNames = ["Khan", "Malik", "Sheikh", "Raza", "Ahmed", "Iqbal", "Butt", "Chaudhry", "Qureshi", "Siddiqui"];
  const cities = ["Lahore", "Karachi", "Islamabad", "Faisalabad", "Rawalpindi", "Multan"];
  const statuses: StudentStatus[] = ["ACTIVE", "ACTIVE", "ACTIVE", "TRIAL", "PAYMENT_PENDING", "INACTIVE", "ALUMNI"];

  const existingStudentCount = await db.student.count();
  if (existingStudentCount === 0) {
    let studentCounter = 1;
    for (let i = 0; i < 25; i++) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[i % lastNames.length];
      const fullName = `${firstName} ${lastName}`;
      const batch = batches[i % batches.length];
      const status = statuses[i % statuses.length];
      const studentCode = `STU-${String(studentCounter++).padStart(5, "0")}`;

      let userId: string | undefined;
      if (i % 2 === 0) {
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@student.parentfirst.pk`;
        const user = await db.user.create({
          data: { name: fullName, email, phone: `0300${1000000 + i}`, passwordHash, roleId: roles.get("STUDENT")!.id, roleKey: "STUDENT" },
        });
        userId = user.id;
      }

      // For INACTIVE/ALUMNI, backdate statusChangedAt to sometime this month so
      // Retention Analytics (Phase 4B) has real "left this month" data to show.
      const statusChangedAt =
        status === "INACTIVE" || status === "ALUMNI"
          ? new Date(new Date().getFullYear(), new Date().getMonth(), 5 + (i % 15))
          : new Date("2026-01-20");

      const student = await db.student.create({
        data: {
          studentCode,
          userId,
          fullName,
          gender: i % 2 === 0 ? "MALE" : "FEMALE",
          phone: `0301${2000000 + i}`,
          whatsapp: `0301${2000000 + i}`,
          city: cities[i % cities.length],
          academicLevelId: batch.level.id,
          status,
          statusChangedAt,
          enrollmentDate: new Date("2026-01-20"),
          createdById: superAdmin.id,
        },
      });

      await db.batchStudent.create({ data: { batchId: batch.id, studentId: student.id } });
      await db.enrollment.create({ data: { studentId: student.id, batchId: batch.id, status: "ACTIVE" } });

      // Parent (every 2 students share nothing; sometimes create a second child for the same parent)
      const parentName = `${["Muhammad", "Abdul", "Rana", "Chaudhry"][i % 4]} ${lastName}`;
      const parentPhone = `0302${3000000 + Math.floor(i / 2)}`;
      let parent = await db.parent.findFirst({ where: { phone: parentPhone } });
      if (!parent) {
        let parentUserId: string | undefined;
        if (i % 3 !== 0) {
          const parentUser = await db.user.create({
            data: { name: parentName, phone: parentPhone, passwordHash, roleId: roles.get("PARENT")!.id, roleKey: "PARENT" },
          });
          parentUserId = parentUser.id;
        }
        parent = await db.parent.create({ data: { userId: parentUserId, fullName: parentName, phone: parentPhone, city: cities[i % cities.length] } });
      }
      await db.studentParentRelationship.create({
        data: { studentId: student.id, parentId: parent.id, relationship: i % 2 === 0 ? "FATHER" : "MOTHER", isPrimary: true },
      });

      // Notes for a few students
      if (i % 5 === 0) {
        await db.studentNote.create({ data: { studentId: student.id, authorId: superAdmin.id, note: "Parent requested extra support in Mathematics." } });
      }
    }
  }

  // ---- Live classes, attendance, homework, recordings ----
  const allStudentsByBatch = new Map<string, { studentId: string }[]>();
  for (const batch of batches) {
    allStudentsByBatch.set(batch.id, await db.batchStudent.findMany({ where: { batchId: batch.id } }));
  }

  const existingClassCount = await db.liveClass.count();
  if (existingClassCount === 0) {
    for (const batch of batches) {
      const batchTeachers = await db.batchTeacher.findMany({ where: { batchId: batch.id }, include: { subject: true } });
      if (batchTeachers.length === 0) continue;
      const roster = allStudentsByBatch.get(batch.id) ?? [];

      // Past classes (last 3 weeks) with attendance
      for (let w = 3; w >= 1; w--) {
        for (const bt of batchTeachers.slice(0, 2)) {
          if (!bt.subjectId) continue;
          const date = new Date();
          date.setDate(date.getDate() - w * 7);
          const liveClass = await db.liveClass.create({
            data: {
              title: `${bt.subject!.name} Session`,
              subjectId: bt.subjectId,
              batchId: batch.id,
              teacherId: bt.teacherId,
              scheduledDate: date,
              startTime: "16:00",
              endTime: "17:00",
              meetingProvider: "ZOOM",
              meetingLink: "https://zoom.us/j/1234567890",
              status: "COMPLETED",
              createdById: superAdmin.id,
            },
          });

          for (const r of roster) {
            const roll = Math.random();
            const status = roll > 0.85 ? "ABSENT" : roll > 0.75 ? "LATE" : "PRESENT";
            await db.attendance.create({
              data: {
                studentId: r.studentId,
                liveClassId: liveClass.id,
                batchId: batch.id,
                subjectId: bt.subjectId,
                date,
                status,
                markedById: superAdmin.id,
              },
            });
          }
        }
      }

      // Today's class (LIVE demo) + an upcoming one tomorrow
      const primary = batchTeachers[0];
      if (primary?.subjectId) {
        await db.liveClass.create({
          data: {
            title: `${primary.subject!.name} — Live Session`,
            subjectId: primary.subjectId,
            batchId: batch.id,
            teacherId: primary.teacherId,
            scheduledDate: new Date(),
            startTime: "18:00",
            endTime: "19:00",
            meetingProvider: "ZOOM",
            meetingLink: "https://zoom.us/j/1234567890",
            status: "LIVE",
            createdById: superAdmin.id,
          },
        });

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await db.liveClass.create({
          data: {
            title: `${primary.subject!.name} — Upcoming Session`,
            subjectId: primary.subjectId,
            batchId: batch.id,
            teacherId: primary.teacherId,
            scheduledDate: tomorrow,
            startTime: "16:00",
            endTime: "17:00",
            meetingProvider: "GOOGLE_MEET",
            meetingLink: "https://meet.google.com/abc-defg-hij",
            status: "UPCOMING",
            createdById: superAdmin.id,
          },
        });
      }

      // Homework
      for (const bt of batchTeachers.slice(0, 2)) {
        if (!bt.subjectId) continue;
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 3);
        const homework = await db.homework.create({
          data: {
            title: `${bt.subject!.name} Practice Set`,
            description: `Complete the practice questions from Chapter 3 of ${bt.subject!.name}.`,
            subjectId: bt.subjectId,
            batchId: batch.id,
            dueDate,
            maxMarks: 20,
            createdById: superAdmin.id,
          },
        });
        for (const r of roster) {
          const roll = Math.random();
          const submissionStatus = roll > 0.7 ? "REVIEWED" : roll > 0.4 ? "SUBMITTED" : "PENDING";
          await db.homeworkSubmission.create({
            data: {
              homeworkId: homework.id,
              studentId: r.studentId,
              status: submissionStatus,
              submittedAt: submissionStatus !== "PENDING" ? new Date() : undefined,
              marksObtained: submissionStatus === "REVIEWED" ? Math.floor(Math.random() * 8) + 12 : undefined,
              teacherFeedback: submissionStatus === "REVIEWED" ? "Good work — review question 4 again." : undefined,
              reviewedById: submissionStatus === "REVIEWED" ? superAdmin.id : undefined,
              reviewedAt: submissionStatus === "REVIEWED" ? new Date() : undefined,
            },
          });
        }
      }

      // Recordings
      if (primary?.subjectId) {
        await db.classRecording.create({
          data: {
            title: `${primary.subject!.name} — Chapter 2 Recap`,
            subjectId: primary.subjectId,
            batchId: batch.id,
            recordingDate: new Date(),
            recordingUrl: "https://drive.google.com/file/d/example",
            createdById: superAdmin.id,
          },
        });
      }

      // ---- Phase 2: Tests ----
      if (primary?.subjectId) {
        const questionDefs = [
          { type: "MCQ" as const, questionText: "What is 12 x 8?", options: ["86", "96", "106", "108"], correctAnswer: "96", marks: 5, topic: "Multiplication", order: 0 },
          { type: "MCQ" as const, questionText: "Which of these is a prime number?", options: ["21", "27", "29", "33"], correctAnswer: "29", marks: 5, topic: "Prime Numbers", order: 1 },
          { type: "MCQ" as const, questionText: "Solve: 5x = 45. What is x?", options: ["5", "7", "9", "11"], correctAnswer: "9", marks: 5, topic: "Linear Equations", order: 2 },
          { type: "NUMERICAL" as const, questionText: "What is the value of pi rounded to 2 decimal places?", correctAnswer: "3.14", marks: 5, topic: "Constants", order: 3 },
          { type: "SHORT_ANSWER" as const, questionText: "Briefly explain the concept covered in this chapter.", marks: 10, topic: "General Concepts", order: 4 },
        ];

        // Completed test with graded + one pending-grading attempt
        const completedTest = await db.test.create({
          data: {
            name: `${primary.subject!.name} Mid-Term Assessment`,
            academicLevelId: batch.academicLevelId,
            subjectId: primary.subjectId,
            batchId: batch.id,
            totalMarks: 30,
            passingMarks: 15,
            durationMinutes: 30,
            startDate: new Date(Date.now() - 7 * 86400000),
            endDate: new Date(Date.now() - 6 * 86400000),
            status: "COMPLETED",
            createdById: superAdmin.id,
          },
        });
        await db.testQuestion.createMany({ data: questionDefs.map((q) => ({ ...q, testId: completedTest.id })) });
        const completedQuestions = await db.testQuestion.findMany({ where: { testId: completedTest.id }, orderBy: { order: "asc" } });

        for (let i = 0; i < Math.min(4, roster.length); i++) {
          const r = roster[i];
          const gradeNow = i !== 1; // leave one attempt pending subjective grading, for demo/verification
          const answers: Record<string, { answer: string; marksAwarded: number | null }> = {};
          let autoTotal = 0;
          for (const q of completedQuestions) {
            if (q.type === "MCQ" || q.type === "NUMERICAL") {
              const correct = i !== 0 && Math.random() > 0.3; // student 0 always wrong, for an at-risk demo case
              const answer = correct ? (q.correctAnswer ?? "") : "Wrong answer";
              const marksAwarded = correct ? q.marks : 0;
              answers[q.id] = { answer, marksAwarded };
              autoTotal += marksAwarded;
            } else {
              const subjectiveMarks = i === 0 ? 2 : Math.floor(Math.random() * 5) + 5;
              answers[q.id] = { answer: "The chapter covers the core principles with worked examples.", marksAwarded: gradeNow ? subjectiveMarks : null };
              if (gradeNow) autoTotal += subjectiveMarks;
            }
          }
          const attempt = await db.testAttempt.create({
            data: { testId: completedTest.id, studentId: r.studentId, startedAt: new Date(Date.now() - 7 * 86400000), submittedAt: new Date(Date.now() - 7 * 86400000 + 25 * 60000), answers },
          });
          await db.testResult.create({
            data: {
              testId: completedTest.id,
              studentId: r.studentId,
              attemptId: attempt.id,
              marksObtained: autoTotal,
              totalMarks: 30,
              gradedById: gradeNow ? superAdmin.id : null,
              gradedAt: gradeNow ? new Date(Date.now() - 6 * 86400000) : null,
            },
          });
        }

        // Active test, open now, no attempts yet — for a live "take the test" demo
        const activeTest = await db.test.create({
          data: {
            name: `${primary.subject!.name} Quick Quiz`,
            academicLevelId: batch.academicLevelId,
            subjectId: primary.subjectId,
            batchId: batch.id,
            totalMarks: 30,
            passingMarks: 15,
            durationMinutes: 20,
            startDate: new Date(Date.now() - 86400000),
            endDate: new Date(Date.now() + 3 * 86400000),
            status: "ACTIVE",
            createdById: superAdmin.id,
          },
        });
        await db.testQuestion.createMany({ data: questionDefs.map((q) => ({ ...q, testId: activeTest.id })) });
      }

      // ---- Phase 2: Participation scores ----
      const periodEnd = new Date();
      const periodStart = new Date(Date.now() - 30 * 86400000);
      for (let i = 0; i < roster.length; i++) {
        const score = i === 0 ? 35 : i === 1 ? 55 : Math.floor(Math.random() * 20) + 75;
        await db.participationScore.create({
          data: { studentId: roster[i].studentId, batchId: batch.id, periodStart, periodEnd, score, recordedById: superAdmin.id },
        });
      }

      // ---- Phase 2: Performance snapshots ----
      for (let i = 0; i < roster.length; i++) {
        const isAtRisk = i === 0;
        const isNeedsAttention = i === 1;
        const attendanceScore = isAtRisk ? 38 : isNeedsAttention ? 58 : Math.floor(Math.random() * 15) + 80;
        const homeworkScore = isAtRisk ? 25 : isNeedsAttention ? 55 : Math.floor(Math.random() * 20) + 75;
        const testScore = isAtRisk ? 15 : isNeedsAttention ? 45 : Math.floor(Math.random() * 20) + 70;
        const participationScore = isAtRisk ? 35 : isNeedsAttention ? 55 : Math.floor(Math.random() * 20) + 75;
        const overallScore = Math.round(attendanceScore * 0.2 + homeworkScore * 0.2 + testScore * 0.4 + participationScore * 0.2);
        const category = isAtRisk ? "AT_RISK" : isNeedsAttention ? "NEEDS_ATTENTION" : overallScore >= 85 ? "EXCELLENT" : "PROGRESSING";
        await db.studentPerformance.create({
          data: { studentId: roster[i].studentId, batchId: batch.id, periodStart, periodEnd, attendanceScore, homeworkScore, testScore, participationScore, overallScore, category },
        });
      }

      // ---- Phase 2: Payment plans ----
      for (let i = 0; i < roster.length; i++) {
        const firstDueDate = new Date(Date.now() - 45 * 86400000);
        const plan = await db.paymentPlan.create({
          data: {
            studentId: roster[i].studentId,
            totalFee: 30000,
            installments: {
              create: [0, 1, 2].map((n) => {
                const dueDate = new Date(firstDueDate);
                dueDate.setMonth(dueDate.getMonth() + n);
                return { installmentNumber: n + 1, amount: 10000, dueDate };
              }),
            },
          },
          include: { installments: { orderBy: { installmentNumber: "asc" } } },
        });

        const pattern = i % 4;
        if (pattern === 0) {
          // Fully paid up
          await db.payment.create({ data: { paymentPlanId: plan.id, studentId: roster[i].studentId, installmentId: plan.installments[0].id, amount: 10000, method: "EASYPAISA", status: "PAID", paidAt: plan.installments[0].dueDate, recordedById: superAdmin.id } });
          await db.installment.update({ where: { id: plan.installments[0].id }, data: { status: "PAID", paidAt: plan.installments[0].dueDate } });
          await db.payment.create({ data: { paymentPlanId: plan.id, studentId: roster[i].studentId, installmentId: plan.installments[1].id, amount: 10000, method: "BANK_TRANSFER", status: "PAID", paidAt: plan.installments[1].dueDate, recordedById: superAdmin.id } });
          await db.installment.update({ where: { id: plan.installments[1].id }, data: { status: "PAID", paidAt: plan.installments[1].dueDate } });
        } else if (pattern === 1) {
          // Partially paid first installment
          await db.payment.create({ data: { paymentPlanId: plan.id, studentId: roster[i].studentId, installmentId: plan.installments[0].id, amount: 5000, method: "JAZZCASH", status: "PAID", paidAt: plan.installments[0].dueDate, recordedById: superAdmin.id } });
          await db.installment.update({ where: { id: plan.installments[0].id }, data: { status: "PARTIALLY_PAID" } });
        } else if (pattern === 2) {
          // First installment paid only
          await db.payment.create({ data: { paymentPlanId: plan.id, studentId: roster[i].studentId, installmentId: plan.installments[0].id, amount: 10000, method: "CASH", status: "PAID", paidAt: plan.installments[0].dueDate, recordedById: superAdmin.id } });
          await db.installment.update({ where: { id: plan.installments[0].id }, data: { status: "PAID", paidAt: plan.installments[0].dueDate } });
        }
        // pattern === 3: nothing paid — installment 1 sits overdue, demonstrating the Payments dashboard
      }
    }
  }

  // ---- Study material ----
  const existingMaterialCount = await db.studyMaterial.count();
  if (existingMaterialCount === 0) {
    for (const level of [class8, class9, class10, firstYear, secondYear]) {
      for (const subjectName of ["Mathematics", "English"]) {
        await db.studyMaterial.create({
          data: {
            title: `${subjectName} — Chapter 1 Notes`,
            type: "NOTES",
            academicLevelId: level.id,
            subjectId: byName(subjectName).id,
            chapter: "Chapter 1",
            fileUrl: "https://drive.google.com/file/d/example-notes",
            uploadedById: superAdmin.id,
          },
        });
      }
    }
  }

  // ---- Phase 3A: AI Knowledge Base ----
  const existingKnowledgeDocCount = await db.knowledgeDocument.count();
  if (existingKnowledgeDocCount === 0) {
    await db.knowledgeDocument.create({
      data: {
        title: "Newton's Third Law — Summary Notes",
        docType: "NOTES",
        academicLevelId: class9.id,
        subjectId: byName("Physics").id,
        chapter: "Chapter 3: Motion and Force",
        content:
          "Newton's Third Law states that for every action there is an equal and opposite reaction. " +
          "When object A exerts a force on object B, object B exerts an equal and opposite force back on object A. " +
          "Example: when you push against a wall, the wall pushes back on you with equal force — this is why walking " +
          "works, since your foot pushes backward on the ground and the ground pushes you forward.",
        status: "APPROVED",
        uploadedById: superAdmin.id,
        reviewedById: superAdmin.id,
        reviewedAt: new Date(),
      },
    });
    await db.knowledgeDocument.create({
      data: {
        title: "Quadratic Equations — Draft Study Guide",
        docType: "STUDY_GUIDE",
        academicLevelId: class10.id,
        subjectId: byName("Mathematics").id,
        chapter: "Chapter 4: Quadratic Equations",
        content: "Draft content pending review — covers the quadratic formula and completing the square.",
        status: "PENDING_REVIEW",
        uploadedById: superAdmin.id,
      },
    });
  }

  // ---- Phase 3: Leads CRM ----
  const existingLeadCount = await db.lead.count();
  if (existingLeadCount === 0) {
    const leadDefs: { studentName: string; parentName: string; parentPhone: string; stage: import("@prisma/client").LeadStage; source: import("@prisma/client").LeadSource; level: typeof class8; campaign?: string }[] = [
      { studentName: "Zoya Farooq", parentName: "Farooq Ahmed", parentPhone: "03334000001", stage: "NEW", source: "FACEBOOK_ADS", level: class9, campaign: "Back to School 2026" },
      { studentName: "Haris Malik", parentName: "Malik Anwar", parentPhone: "03334000002", stage: "CONTACTED", source: "WEBSITE", level: class10, campaign: "Back to School 2026" },
      { studentName: "Areeba Khan", parentName: "Khan Bilal", parentPhone: "03334000003", stage: "ASSESSMENT_BOOKED", source: "INSTAGRAM_ADS", level: firstYear, campaign: "Ramadan Offer" },
      { studentName: "Shayan Iqbal", parentName: "Iqbal Rashid", parentPhone: "03334000004", stage: "ASSESSMENT_COMPLETED", source: "REFERRAL", level: secondYear, campaign: "Ramadan Offer" },
      { studentName: "Mahnoor Sheikh", parentName: "Sheikh Tariq", parentPhone: "03334000005", stage: "FREE_TRIAL", source: "WHATSAPP", level: class8 },
      { studentName: "Danyal Raza", parentName: "Raza Farhan", parentPhone: "03334000006", stage: "COUNSELLING", source: "ORGANIC", level: class10 },
      { studentName: "Eshal Butt", parentName: "Butt Naveed", parentPhone: "03334000007", stage: "PAYMENT_PENDING", source: "SCHOOL_PARTNERSHIP", level: class9 },
      { studentName: "Fahad Chaudhry", parentName: "Chaudhry Imran", parentPhone: "03334000008", stage: "ENROLLED", source: "WEBSITE", level: firstYear, campaign: "Back to School 2026" },
      { studentName: "Rimsha Aslam", parentName: "Aslam Waqar", parentPhone: "03334000009", stage: "LOST", source: "OTHER", level: class8 },
    ];

    for (const def of leadDefs) {
      const lead = await db.lead.create({
        data: {
          studentName: def.studentName,
          parentName: def.parentName,
          parentPhone: def.parentPhone,
          academicLevelId: def.level.id,
          source: def.source,
          campaign: def.campaign,
          stage: def.stage,
          assignedCounselorId: counselor.id,
          weakSubjects: def.stage === "ASSESSMENT_COMPLETED" || def.stage === "FREE_TRIAL" ? ["Mathematics", "Physics"] : [],
        },
      });

      await db.leadActivity.create({
        data: { leadId: lead.id, type: "CALL", description: "Initial call — introduced the academy and answered questions.", createdById: counselorUser.id },
      });

      if (def.stage !== "ENROLLED" && def.stage !== "LOST") {
        await db.leadFollowup.create({
          data: { leadId: lead.id, dueDate: new Date(Date.now() + (Math.random() > 0.5 ? -2 : 2) * 86400000), notes: "Follow up on next steps." },
        });
      }

      if (["ASSESSMENT_COMPLETED", "FREE_TRIAL", "COUNSELLING", "PAYMENT_PENDING", "ENROLLED"].includes(def.stage)) {
        await db.assessment.create({
          data: { leadId: lead.id, overallScore: 62, weakSubjects: ["Mathematics"], recommendedProgram: "Safe at Home" },
        });
      }

      if (["FREE_TRIAL", "COUNSELLING", "PAYMENT_PENDING", "ENROLLED"].includes(def.stage)) {
        const trialBatch = batches.find((b) => b.academicLevelId === def.level.id) ?? batches[0];
        await db.trial.create({
          data: {
            leadId: lead.id,
            batchId: trialBatch.id,
            startDate: new Date(Date.now() - 10 * 86400000),
            endDate: new Date(Date.now() - 7 * 86400000),
            classesAttended: 3,
            engagementNotes: "Engaged well, asked good questions.",
            counselorId: counselor.id,
            enrollmentStatus: def.stage === "ENROLLED" ? "CONVERTED" : "COMPLETED",
          },
        });
      }

      if (def.stage === "ENROLLED") {
        const convertedStudentCode = await (async () => {
          const count = await db.student.count();
          return `STU-${String(count + 1).padStart(5, "0")}`;
        })();
        const enrolledStudent = await db.student.create({
          data: {
            studentCode: convertedStudentCode,
            fullName: def.studentName,
            phone: def.parentPhone,
            academicLevelId: def.level.id,
            status: "ACTIVE",
            enrollmentDate: new Date(),
            createdById: superAdmin.id,
          },
        });
        await db.lead.update({ where: { id: lead.id }, data: { convertedStudentId: enrolledStudent.id } });
      }
    }
  }

  // ---- Phase 3: Announcements (auto-generates notifications) ----
  const existingAnnouncementCount = await db.announcement.count();
  if (existingAnnouncementCount === 0) {
    const allStudentUsers = await db.student.findMany({ where: { userId: { not: null } }, select: { userId: true } });
    const allParentUsers = await db.parent.findMany({ where: { userId: { not: null } }, select: { userId: true } });
    const allTeacherUsers = await db.teacher.findMany({ select: { userId: true } });

    const announcementDefs = [
      { title: "Mid-Term Exams Schedule Released", message: "Mid-term exams begin next week. Check your batch's Tests tab for dates.", audience: "ALL_STUDENTS" as const, userIds: allStudentUsers.map((s) => s.userId!) },
      { title: "Fee Reminder — September", message: "Please clear pending installments before the due date to avoid late fees.", audience: "PARENTS" as const, userIds: allParentUsers.map((p) => p.userId!) },
      { title: "Staff Meeting Friday", message: "All teachers please join the weekly sync at 5 PM Friday.", audience: "TEACHERS" as const, userIds: allTeacherUsers.map((t) => t.userId) },
    ];

    for (const def of announcementDefs) {
      const announcement = await db.announcement.create({
        data: { title: def.title, message: def.message, audience: def.audience, createdById: superAdmin.id },
      });
      if (def.userIds.length > 0) {
        await db.notification.createMany({
          data: def.userIds.map((userId) => ({
            userId,
            type: "ANNOUNCEMENT" as const,
            title: def.title,
            message: def.message,
            relatedEntityType: "Announcement",
            relatedEntityId: announcement.id,
          })),
        });
      }
    }
  }

  // ---- Phase 3: Parent reports & communication logs ----
  const sampleStudents = await db.student.findMany({ take: 5, orderBy: { createdAt: "asc" } });
  const existingReportCount = await db.parentReport.count();
  if (existingReportCount === 0) {
    for (const s of sampleStudents) {
      const periodEnd = new Date();
      const periodStart = new Date(Date.now() - 7 * 86400000);
      await db.parentReport.create({
        data: {
          studentId: s.id,
          periodStart,
          periodEnd,
          attendancePercent: 78,
          classesAttended: 5,
          homeworkCompletionPercent: 70,
          overallScore: 74,
          teacherFeedback: "Good progress this week, participates actively in class.",
          weakAreas: "Needs more practice with algebra word problems.",
          nextWeekGoal: "Complete all assigned practice sets before the next class.",
          sentAt: new Date(),
        },
      });

      await db.communicationLog.create({
        data: {
          type: "WHATSAPP",
          studentId: s.id,
          subject: "Weekly progress update",
          messageSummary: "Sent the weekly parent report via WhatsApp and confirmed receipt.",
          staffId: superAdmin.id,
          status: "READ",
        },
      });
    }
  }

  // ---- Phase 4A: Automation rules & WhatsApp message templates ----
  const automationRuleDefs = [
    { key: "ATTENDANCE_ABSENCE" as const, name: "Student Misses Class", description: "Notify teacher, parent, and admin after N consecutive absences.", config: { consecutiveAbsences: 2 } },
    { key: "HOMEWORK_OVERDUE" as const, name: "Homework Overdue", description: "Student reminded immediately; teacher then parent notified after configurable delays.", config: { teacherNotifyAfterDays: 2, parentNotifyAfterDays: 5 } },
    { key: "LOW_TEST_SCORE" as const, name: "Low Test Performance", description: "Flag a below-threshold score for teacher review; notify parent if it repeats.", config: { thresholdPercent: 40, repeatedCountForParentAlert: 2 } },
    { key: "PAYMENT_REMINDER" as const, name: "Payment Reminders", description: "Remind the parent before and on the due date; escalate to an admin follow-up if overdue.", config: { beforeDueDays: 5, overdueDaysForFollowup: 3 } },
    { key: "STUDENT_INACTIVITY" as const, name: "Student Inactivity", description: "Notify the student, parent, and admin engagement dashboard after no login for N days.", config: { inactiveDays: 7 } },
    { key: "TRIAL_EXPIRY" as const, name: "Trial Expiry", description: "When a trial ends: create a counselor follow-up, move the lead to Payment Pending, notify the counselor.", config: {} },
    { key: "LEAD_FOLLOWUP" as const, name: "Lead Follow-up", description: "Auto-create an overdue follow-up when a lead has had no activity for N days.", config: { staleDays: 5 } },
    { key: "CLASS_REMINDER" as const, name: "Class Reminders", description: "Which reminders go out before a live class, and who besides the student gets them.", config: { offset24hMinutes: 1440, offset1hMinutes: 60, offset30mMinutes: 30, offset24hEnabled: 0, offset1hEnabled: 1, offset30mEnabled: 1, notifyParent: 0, notifyTeacher: 0 } },
    { key: "WEEKLY_PARENT_REPORT" as const, name: "Weekly Parent Report", description: "Generates and sends every active student's weekly progress report automatically.", config: {} },
  ];

  for (const def of automationRuleDefs) {
    await db.automationRule.upsert({
      where: { key: def.key },
      update: {},
      create: { key: def.key, name: def.name, description: def.description, config: def.config },
    });
  }

  const messageTemplateDefs = [
    {
      key: "LEAD_WELCOME" as const,
      name: "Lead Welcome",
      body: "Hi {{parent_name}}! Thanks for your interest in Parent-First Online Academy for {{student_name}}. Our team will reach out shortly to schedule a free assessment.",
      emailSubject: "Thanks for your interest in Parent-First Online Academy",
      emailBody: "Hi {{parent_name}},\n\nThanks for your interest in Parent-First Online Academy for {{student_name}}. Our team will reach out shortly to schedule a free assessment.\n\n— Parent-First Online Academy",
    },
    {
      key: "TRIAL_REMINDER" as const,
      name: "Trial Reminder",
      body: "Hi! This is a reminder about {{student_name}}'s free trial class. We'd love your feedback once it's done.",
      emailSubject: "Reminder: {{student_name}}'s free trial class",
      emailBody: "Hi,\n\nThis is a reminder about {{student_name}}'s free trial class. We'd love your feedback once it's done.\n\n— Parent-First Online Academy",
    },
    {
      key: "CLASS_REMINDER" as const,
      name: "Class Reminder",
      body: "Reminder: {{class_name}} ({{subject}}) for {{batch_name}} starts at {{time}}. See you there!",
      emailSubject: "Upcoming class: {{class_name}} at {{time}}",
      emailBody: "Reminder: {{class_name}} ({{subject}}) for {{batch_name}} starts at {{time}}. See you there!\n\n— Parent-First Online Academy",
    },
    {
      key: "HOMEWORK_REMINDER" as const,
      name: "Homework Reminder",
      body: "{{student_name}}'s {{subject}} homework needs attention — please check the academy portal.",
      emailSubject: "Homework needs attention — {{subject}}",
      emailBody: "{{student_name}}'s {{subject}} homework needs attention — please check the academy portal.\n\n— Parent-First Online Academy",
    },
    {
      key: "TEST_REMINDER" as const,
      name: "Test Reminder",
      body: "Reminder: {{student_name}} has a {{subject}} test coming up on {{date}}.",
      emailSubject: "Upcoming test: {{subject}} on {{date}}",
      emailBody: "Reminder: {{student_name}} has a {{subject}} test coming up on {{date}}.\n\n— Parent-First Online Academy",
    },
    {
      key: "PAYMENT_REMINDER" as const,
      name: "Payment Reminder",
      body: "Dear {{parent_name}}, {{student_name}}'s installment of {{payment_amount}} is due on {{date}}. Please arrange payment to avoid late fees.",
      emailSubject: "Payment due: {{payment_amount}} on {{date}}",
      emailBody: "Dear {{parent_name}},\n\n{{student_name}}'s installment of {{payment_amount}} is due on {{date}}. Please arrange payment to avoid late fees.\n\n— Parent-First Online Academy",
    },
    {
      key: "ATTENDANCE_ALERT" as const,
      name: "Attendance Alert",
      body: "{{student_name}} has missed consecutive classes. Please reach out if there's anything we can help with.",
      emailSubject: "Attendance alert for {{student_name}}",
      emailBody: "{{student_name}} has missed consecutive classes. Please reach out if there's anything we can help with.\n\n— Parent-First Online Academy",
    },
    {
      key: "AT_RISK_ALERT" as const,
      name: "At-Risk Alert",
      body: "{{student_name}} needs additional support to stay on track. Our team is happy to discuss how we can help.",
      emailSubject: "{{student_name}} may need extra support",
      emailBody: "{{student_name}} needs additional support to stay on track. Our team is happy to discuss how we can help.\n\n— Parent-First Online Academy",
    },
    {
      key: "WEEKLY_PARENT_REPORT" as const,
      name: "Weekly Parent Report",
      body: "{{student_name}}'s weekly progress report is ready — log in to the parent portal to view attendance, homework, and test performance.",
      emailSubject: "{{student_name}}'s weekly progress report is ready",
      emailBody: "{{student_name}}'s weekly progress report is ready — log in to the parent portal to view attendance, homework, and test performance.\n\n— Parent-First Online Academy",
    },
    {
      key: "ANNOUNCEMENT" as const,
      name: "Announcement",
      body: "📢 {{announcement_title}}\n\n{{announcement_message}}",
      emailSubject: "{{announcement_title}}",
      emailBody: "{{announcement_message}}\n\n— Parent-First Online Academy",
    },
    {
      key: "REFERRAL_INVITATION" as const,
      name: "Referral Invitation",
      body: "{{parent_name}} thinks Parent-First Online Academy could help your child too! Use their referral link to book a free assessment.",
      emailSubject: "{{parent_name}} thinks you'd like Parent-First Online Academy",
      emailBody: "{{parent_name}} thinks Parent-First Online Academy could help your child too! Use their referral link to book a free assessment.\n\n— Parent-First Online Academy",
    },
  ];

  for (const def of messageTemplateDefs) {
    await db.messageTemplate.upsert({
      where: { key: def.key },
      update: {},
      create: { key: def.key, name: def.name, body: def.body, emailSubject: def.emailSubject, emailBody: def.emailBody },
    });
    // One-time backfill for rows created before emailSubject/emailBody existed — never
    // overwrites a row an admin has already customized (update: {} above is what protects that
    // going forward; this only fills in the still-null default for a template nobody has touched).
    await db.messageTemplate.updateMany({
      where: { key: def.key, emailSubject: null },
      data: { emailSubject: def.emailSubject, emailBody: def.emailBody },
    });
  }

  // ---- Phase 4C: Gamification, Referrals, Support & Student Success ----
  const seedStudents = await db.student.findMany({ take: 8, orderBy: { studentCode: "asc" }, include: { user: true } });
  const seedParents = await db.parent.findMany({ take: 3 });

  const existingBadgeCount = await db.badge.count();
  if (existingBadgeCount === 0 && seedStudents.length > 0) {
    const badgeDefs = [
      { name: "Perfect Attendance", description: "5 classes in a row with full attendance." },
      { name: "Homework Hero", description: "Consistently submits homework on time." },
      { name: "Top Scorer", description: "Scored 90%+ on a test." },
    ];
    const badges = [];
    for (const b of badgeDefs) {
      badges.push(await db.badge.upsert({ where: { name: b.name }, update: {}, create: b }));
    }

    await db.studentBadge.create({ data: { studentId: seedStudents[0].id, badgeId: badges[0].id, note: "Seeded for demo." } });
    await db.studentBadge.create({ data: { studentId: seedStudents[0].id, badgeId: badges[2].id, note: "Seeded for demo." } });
    if (seedStudents[1]) await db.studentBadge.create({ data: { studentId: seedStudents[1].id, badgeId: badges[1].id, note: "Seeded for demo." } });

    await db.studentPoint.createMany({
      data: [
        { studentId: seedStudents[0].id, points: 5, reason: "Present in class", source: "ATTENDANCE" },
        { studentId: seedStudents[0].id, points: 25, reason: "High test score", source: "TEST" },
        { studentId: seedStudents[0].id, points: 20, reason: "Perfect week bonus", source: "PERFECT_ATTENDANCE" },
        ...(seedStudents[1] ? [{ studentId: seedStudents[1].id, points: 5, reason: "Homework submitted", source: "HOMEWORK" }, { studentId: seedStudents[1].id, points: 10, reason: "Homework reviewed", source: "HOMEWORK" }] : []),
        ...(seedStudents[2] ? [{ studentId: seedStudents[2].id, points: 5, reason: "Present in class", source: "ATTENDANCE" }] : []),
      ],
    });
  }

  const existingReferralCount = await db.referral.count();
  if (existingReferralCount === 0 && seedStudents.length > 1 && seedParents.length > 0) {
    await db.student.update({ where: { id: seedStudents[0].id }, data: { referralCode: "STU-DEMO01" } });
    await db.parent.update({ where: { id: seedParents[0].id }, data: { referralCode: "PAR-DEMO01" } });

    await db.referral.create({
      data: {
        referrerStudentId: seedStudents[0].id,
        referralCode: "STU-DEMO01",
        referredName: "Owais Farooq",
        referredPhone: "03211110001",
        status: "REGISTERED",
      },
    });
    await db.referral.create({
      data: {
        referrerParentId: seedParents[0].id,
        referralCode: "PAR-DEMO01",
        referredName: "Sadia Anwar",
        referredPhone: "03211110002",
        status: "TRIAL",
      },
    });
    const enrolledReferral = await db.referral.create({
      data: {
        referrerStudentId: seedStudents[0].id,
        referralCode: "STU-DEMO01",
        referredName: "Kamran Aslam",
        referredPhone: "03211110003",
        status: "REWARDED",
        convertedStudentId: seedStudents[1]?.id,
      },
    });
    await db.referralReward.create({
      data: { referralId: enrolledReferral.id, rewardType: "FREE_MONTH", description: "One free month for a successful referral.", grantedById: superAdmin.id },
    });
  }

  const seedTicketRaiser = seedStudents.find((s) => s.userId)?.user;
  const existingTicketCount = await db.supportTicket.count();
  if (existingTicketCount === 0 && seedTicketRaiser) {
    const openTicket = await db.supportTicket.create({
      data: {
        raisedById: seedTicketRaiser.id,
        category: "TECHNICAL",
        subject: "Can't join today's live class",
        description: "The Zoom link on my dashboard isn't opening.",
        status: "IN_PROGRESS",
        priority: "HIGH",
        assignedToId: superAdmin.id,
      },
    });
    await db.supportMessage.create({ data: { ticketId: openTicket.id, authorId: superAdmin.id, message: "Thanks for flagging — could you try refreshing the page? We're checking the class link now." } });
    await db.supportMessage.create({ data: { ticketId: openTicket.id, authorId: seedTicketRaiser.id, message: "Still the same issue on my end." } });

    await db.supportTicket.create({
      data: {
        raisedById: seedTicketRaiser.id,
        category: "PAYMENT",
        subject: "Question about this month's installment",
        description: "Can I get a receipt for last month's payment?",
        status: "RESOLVED",
        priority: "LOW",
        assignedToId: superAdmin.id,
      },
    });
  }

  const existingInterventionCount = await db.intervention.count();
  if (existingInterventionCount === 0 && seedStudents.length > 3 && teachers.length > 0) {
    await db.intervention.create({
      data: {
        studentId: seedStudents[3].id,
        reason: "Attendance dropped below 50% over the last two weeks.",
        actionPlan: "Weekly check-in call with parent; teacher to follow up on missed topics.",
        responsibleStaffId: teachers[0].userId,
        startDate: new Date(),
        reviewDate: new Date(Date.now() + 14 * 86400000),
        status: "OPEN",
        createdById: superAdmin.id,
      },
    });
  }

  console.log("Seed complete.");
  console.log(`All seeded users share the password: ${DEFAULT_PASSWORD}`);
  console.log("Super Admin login: owner@parentfirst.pk / 03001234567");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
