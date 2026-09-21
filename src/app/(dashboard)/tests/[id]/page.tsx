import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import * as testService from "@/lib/services/tests";
import * as staffService from "@/lib/services/staff";
import * as analyticsService from "@/lib/services/analytics";
import * as teacherAssistantService from "@/lib/services/teacher-assistant";
import { STAFF_ROLES } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import { QuestionsTab } from "./questions-tab";
import { GradingTab } from "./grading-tab";
import { ResultsTab } from "./results-tab";
import { TestStatusSelect } from "./status-select";

export default async function TestDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isStaff = STAFF_ROLES.includes(session.user.role);
  let canManage = isStaff;

  if (session.user.role === "TEACHER") {
    const teacher = await staffService.getTeacherByUserId(session.user.id);
    if (teacher) {
      const test = await db.test.findUnique({ where: { id: params.id }, select: { batchId: true } });
      if (test) {
        const assigned = await db.batchTeacher.findFirst({ where: { batchId: test.batchId, teacherId: teacher.id } });
        canManage = Boolean(assigned);
      }
    }
  }

  if (!isStaff && !canManage) redirect(session.user.role === "STUDENT" ? "/student/tests" : "/");

  const test = await testService.getTestById(params.id);
  if (!test) notFound();

  const [attempts, results, stats, questionAnalytics, difficultExplanation] = await Promise.all([
    testService.listAttemptsForTest(test.id),
    testService.listResultsForTest(test.id),
    testService.testResultStats(test.id),
    analyticsService.questionAnalytics(test.id),
    teacherAssistantService.getLatestDifficultQuestionsExplanation(test.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={test.name}
        description={`${test.subject.name} · ${test.batch.name} · ${test.totalMarks} marks · ${formatDate(test.startDate)} – ${formatDate(test.endDate)}`}
        actions={
          <>
            {canManage ? <TestStatusSelect testId={test.id} status={test.status} /> : <StatusBadge status={test.status} />}
            <Button asChild variant="outline" size="sm">
              <Link href={`/batches/${test.batchId}`}>Back to Batch</Link>
            </Button>
          </>
        }
      />

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="grading">Attempts &amp; Grading</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="questions">
          <QuestionsTab testId={test.id} questions={test.questions} canManage={canManage} />
        </TabsContent>

        <TabsContent value="grading">
          <GradingTab testId={test.id} attempts={attempts} questions={test.questions} canManage={canManage} />
        </TabsContent>

        <TabsContent value="results">
          <ResultsTab
            testId={test.id}
            stats={stats}
            results={results}
            questionAnalytics={questionAnalytics}
            canManage={canManage}
            initialExplanation={difficultExplanation?.response ?? null}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
