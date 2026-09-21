import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import * as leadService from "@/lib/services/leads";
import * as batchService from "@/lib/services/batches";
import * as staffService from "@/lib/services/staff";
import { STAFF_ROLES } from "@/lib/permissions";
import { getCounselorRecordForUser } from "@/lib/access";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StageSelect } from "./stage-select";
import { OverviewTab } from "./overview-tab";
import { ActivitiesTab } from "./activities-tab";
import { FollowupsTab } from "./followups-tab";
import { AssessmentTab } from "./assessment-tab";
import { TrialTab } from "./trial-tab";

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isStaff = STAFF_ROLES.includes(session.user.role);
  let canManage = isStaff;

  if (session.user.role === "COUNSELOR") {
    const counselor = await getCounselorRecordForUser(session.user.id);
    const lead = counselor ? await leadService.getLeadById(params.id) : null;
    canManage = Boolean(counselor && lead?.assignedCounselorId === counselor.id);
  }

  if (!isStaff && !canManage) redirect(session.user.role === "COUNSELOR" ? "/counselor/leads" : "/");

  const lead = await leadService.getLeadById(params.id);
  if (!lead) notFound();

  const batches = await batchService.listBatchesForPicker();
  const counselors = isStaff ? await staffService.listCounselors() : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={lead.studentName}
        description={`${lead.parentName} · ${lead.parentPhone}`}
        actions={
          <>
            {canManage ? (
              <StageSelect leadId={lead.id} stage={lead.stage} />
            ) : null}
            <Button asChild variant="outline" size="sm">
              <Link href={isStaff ? "/admin/leads" : "/counselor/leads"}>Back to Leads</Link>
            </Button>
          </>
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="followups">Follow-ups</TabsTrigger>
          <TabsTrigger value="assessment">Assessment</TabsTrigger>
          <TabsTrigger value="trial">Trial</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab lead={lead} canManage={canManage} isStaff={isStaff} counselors={counselors} />
        </TabsContent>

        <TabsContent value="activities">
          <ActivitiesTab leadId={lead.id} activities={lead.activities} canManage={canManage} />
        </TabsContent>

        <TabsContent value="followups">
          <FollowupsTab leadId={lead.id} followups={lead.followups} canManage={canManage} />
        </TabsContent>

        <TabsContent value="assessment">
          <AssessmentTab leadId={lead.id} assessments={lead.assessments} canManage={canManage} />
        </TabsContent>

        <TabsContent value="trial">
          <TrialTab leadId={lead.id} trials={lead.trials} batches={batches} canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
