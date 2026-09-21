import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { TrendLineChart } from "@/components/shared/charts/trend-line-chart";
import type { performanceTrend } from "@/lib/services/analytics";

export function TrendsTab({ last7, last30 }: { last7: Awaited<ReturnType<typeof performanceTrend>>; last30: Awaited<ReturnType<typeof performanceTrend>> }) {
  const series = [
    { key: "overallScore", label: "Overall Score", color: "hsl(var(--primary))" },
    { key: "attendanceScore", label: "Attendance", color: "hsl(var(--success))" },
    { key: "homeworkScore", label: "Homework", color: "hsl(var(--warning))" },
    { key: "testScore", label: "Tests", color: "hsl(var(--destructive))" },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last 7 Days</CardTitle>
          <CardDescription>Averages across every performance snapshot calculated in this window — only as current as the last time staff (or automation) recalculated performance.</CardDescription>
        </CardHeader>
        <CardContent>
          {last7.length === 0 ? <EmptyState title="No performance snapshots in the last 7 days" className="py-8" /> : <TrendLineChart data={last7} series={series} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent>
          {last30.length === 0 ? <EmptyState title="No performance snapshots in the last 30 days" className="py-8" /> : <TrendLineChart data={last30} series={series} />}
        </CardContent>
      </Card>
    </div>
  );
}
