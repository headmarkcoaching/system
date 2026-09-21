import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { STAFF_ROLES } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TestConnectionButton } from "./test-connection-button";

export default async function PaymentGatewaySettingsPage() {
  const session = await auth();
  if (!session?.user || !STAFF_ROLES.includes(session.user.role)) redirect("/login");

  const activeProvider = process.env.PAYMENT_PROVIDER || "console";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Gateway"
        description="Provider-agnostic payment architecture — a real gateway integration plugs in behind this interface with no change to the existing manual payment-recording flow."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Provider</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={activeProvider === "console" ? "secondary" : "success"}>{activeProvider}</Badge>
            {activeProvider === "console" && <span className="text-xs text-muted-foreground">No real gateway configured — payments are still recorded manually.</span>}
          </div>
          <TestConnectionButton />
        </CardContent>
      </Card>
    </div>
  );
}
