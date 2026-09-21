import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as analyticsService from "@/lib/services/analytics";
import { BusinessTab } from "./business-tab";
import { MarketingTab } from "./marketing-tab";
import { RetentionTab } from "./retention-tab";
import { AcademicTab } from "./academic-tab";
import { TrendsTab } from "./trends-tab";
import { CohortTab } from "./cohort-tab";

export default async function AdminAnalyticsPage() {
  const [metrics, funnel, marketing, retention, academic, trend7, trend30, cohort] = await Promise.all([
    analyticsService.businessMetrics(),
    analyticsService.leadFunnel(),
    analyticsService.marketingAnalytics(),
    analyticsService.retentionAnalytics(),
    analyticsService.academicAnalytics(),
    analyticsService.performanceTrend({ days: 7 }),
    analyticsService.performanceTrend({ days: 30 }),
    analyticsService.cohortAnalytics(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" description="Business health, marketing performance, retention, academics, cohort comparisons, and trends — all in one place." />

      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="cohort">Cohort</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <BusinessTab metrics={metrics} funnel={funnel} />
        </TabsContent>
        <TabsContent value="marketing">
          <MarketingTab data={marketing} />
        </TabsContent>
        <TabsContent value="retention">
          <RetentionTab data={retention} />
        </TabsContent>
        <TabsContent value="academic">
          <AcademicTab data={academic} />
        </TabsContent>
        <TabsContent value="cohort">
          <CohortTab data={cohort} />
        </TabsContent>
        <TabsContent value="trends">
          <TrendsTab last7={trend7} last30={trend30} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
