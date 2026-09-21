"use client";

import * as React from "react";
import { toast } from "sonner";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { testPaymentProviderConnectionAction } from "./actions";

export function TestConnectionButton() {
  const [pending, setPending] = React.useState(false);
  const [result, setResult] = React.useState<{ status: string; providerReference?: string; errorMessage?: string } | null>(null);

  async function handleTest() {
    setPending(true);
    try {
      const res = await testPaymentProviderConnectionAction();
      setResult(res);
      toast[res.status === "SUCCESS" ? "success" : "error"](`Provider responded: ${res.status}`);
    } catch {
      toast.error("Could not reach the payment provider.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button variant="outline" size="sm" onClick={handleTest} disabled={pending}>
        <Zap className="mr-1.5 h-3.5 w-3.5" /> {pending ? "Testing…" : "Test Connection"}
      </Button>
      {result && (
        <p className="text-xs text-muted-foreground">
          {result.status === "SUCCESS" ? `Reference: ${result.providerReference}` : result.errorMessage}
        </p>
      )}
    </div>
  );
}
