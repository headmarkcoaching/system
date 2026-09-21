import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import type { cohortAnalytics, CohortRow } from "@/lib/services/analytics";

function scoreTone(value: number) {
  if (value >= 70) return "success" as const;
  if (value >= 40) return "warning" as const;
  return "destructive" as const;
}

function cohortColumns(): DataTableColumn<CohortRow>[] {
  return [
    { key: "name", header: "Cohort", cell: (r) => r.name },
    { key: "students", header: "Students", cell: (r) => r.studentCount, hideOnMobile: true },
    { key: "attendance", header: "Attendance", cell: (r) => <Badge variant={scoreTone(r.avgAttendance)}>{r.avgAttendance}%</Badge> },
    { key: "homework", header: "Homework", cell: (r) => <Badge variant={scoreTone(r.avgHomeworkCompletion)}>{r.avgHomeworkCompletion}%</Badge> },
    { key: "tests", header: "Tests", cell: (r) => <Badge variant={scoreTone(r.avgTestScore)}>{r.avgTestScore}%</Badge> },
    { key: "overall", header: "Overall Performance", cell: (r) => <Badge variant={scoreTone(r.avgOverallPerformance)}>{r.avgOverallPerformance}</Badge> },
  ];
}

/** Side-by-side comparison of cohorts, distinct from the Academic tab's single-metric charts —
 * this answers "which cohort as a whole is doing better/worse," not "what's the weakest
 * chapter." Reuses the same underlying rates as academicAnalytics() via analytics.ts's
 * cohortAnalytics(), just grouped and displayed differently. */
export function CohortTab({ data }: { data: Awaited<ReturnType<typeof cohortAnalytics>> }) {
  const columns = cohortColumns();
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">By Batch</CardTitle>
          <CardDescription>Compare batches side by side on attendance, homework, tests, and overall performance.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data.byBatch} rowKey={(r) => r.id} emptyTitle="No batches yet" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">By Academic Level</CardTitle>
          <CardDescription>Compare academic levels side by side on the same metrics.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data.byAcademicLevel} rowKey={(r) => r.id} emptyTitle="No academic levels yet" />
        </CardContent>
      </Card>
    </div>
  );
}
