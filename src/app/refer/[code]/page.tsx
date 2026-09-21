import { notFound } from "next/navigation";
import * as referralsService from "@/lib/services/referrals";
import * as academicService from "@/lib/services/academic-structure";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReferralForm } from "./referral-form";

export default async function ReferralLandingPage({ params }: { params: { code: string } }) {
  const [referrerName, levels] = await Promise.all([
    referralsService.getReferrerNameForCode(params.code),
    academicService.listAcademicLevels(),
  ]);

  if (!referrerName) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>You&apos;re invited by {referrerName}!</CardTitle>
          <CardDescription>Join Head Mark Coaching — live group classes with real accountability and parent visibility. Fill in your details for a free trial class.</CardDescription>
        </CardHeader>
        <CardContent>
          <ReferralForm code={params.code} levels={levels.filter((l) => l.isActive)} />
        </CardContent>
      </Card>
    </div>
  );
}
