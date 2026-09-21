"use client";

import * as React from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Copy } from "lucide-react";

export function MyReferralCard({
  referralCode,
  stats,
}: {
  referralCode: string;
  stats: { total: number; registered: number; trials: number; enrolled: number };
}) {
  const [link, setLink] = React.useState("");

  React.useEffect(() => {
    setLink(`${window.location.origin}/refer/${referralCode}`);
  }, [referralCode]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Referral link copied!");
    } catch {
      toast.error("Could not copy — copy it manually instead.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Share2 className="h-4 w-4 text-primary" /> My Referral
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input readOnly value={link} className="text-xs" />
          <Button type="button" size="sm" variant="outline" onClick={copyLink} disabled={!link}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div>
            <p className="text-lg font-bold">{stats.total}</p>
            <p className="text-muted-foreground">Referred</p>
          </div>
          <div>
            <p className="text-lg font-bold">{stats.registered}</p>
            <p className="text-muted-foreground">Registered</p>
          </div>
          <div>
            <p className="text-lg font-bold">{stats.trials}</p>
            <p className="text-muted-foreground">On Trial</p>
          </div>
          <div>
            <p className="text-lg font-bold">{stats.enrolled}</p>
            <p className="text-muted-foreground">Enrolled</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
