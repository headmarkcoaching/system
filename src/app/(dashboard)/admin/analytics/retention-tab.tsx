import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, UserPlus, UserMinus, TrendingUp, TrendingDown } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { retentionAnalytics } from "@/lib/services/analytics";

export function RetentionTab({ data }: { data: Awaited<ReturnType<typeof retentionAnalytics>> }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">This Month — {formatDate(data.monthStart)}</CardTitle>
          <CardDescription>
            Based on each student&apos;s current status and when it last changed — not a full history, so a student who left and later re-enrolled won&apos;t be perfectly reflected.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Active at Start" value={data.activeAtStart} icon={Users} />
          <StatCard label="New Enrollments" value={data.newEnrollments} icon={UserPlus} tone="success" />
          <StatCard label="Left" value={data.left} icon={UserMinus} tone={data.left > 0 ? "destructive" : "default"} />
          <StatCard label="Retention Rate" value={`${data.retentionRate}%`} icon={TrendingUp} tone={data.retentionRate >= 80 ? "success" : data.retentionRate >= 60 ? "warning" : "destructive"} />
          <StatCard label="Churn Rate" value={`${data.churnRate}%`} icon={TrendingDown} tone={data.churnRate <= 20 ? "success" : data.churnRate <= 40 ? "warning" : "destructive"} />
        </CardContent>
      </Card>
    </div>
  );
}
