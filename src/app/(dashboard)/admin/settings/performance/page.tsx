import { PageHeader } from "@/components/shared/page-header";
import * as performanceService from "@/lib/services/performance";
import { PerformanceConfigForm } from "./config-form";

export default async function PerformanceSettingsPage() {
  const config = await performanceService.getPerformanceConfig();

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Performance Rules" description="Configure how the Academic Performance Score and At-Risk detection are calculated academy-wide." />
      <PerformanceConfigForm
        config={{
          attendanceWeight: config.attendanceWeight,
          homeworkWeight: config.homeworkWeight,
          testWeight: config.testWeight,
          participationWeight: config.participationWeight,
          excellentThreshold: config.excellentThreshold,
          progressingThreshold: config.progressingThreshold,
          needsAttentionThreshold: config.needsAttentionThreshold,
          atRiskAttendanceBelow: config.atRiskAttendanceBelow,
          atRiskHomeworkBelow: config.atRiskHomeworkBelow,
          atRiskTestBelow: config.atRiskTestBelow,
        }}
      />
    </div>
  );
}
