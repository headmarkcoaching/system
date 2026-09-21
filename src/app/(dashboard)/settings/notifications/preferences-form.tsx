"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { updateNotificationPreferencesAction } from "./actions";

interface Preference {
  whatsappEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
}

export function NotificationPreferencesForm({ preference }: { preference: Preference }) {
  const [values, setValues] = React.useState(preference);
  const [pending, setPending] = React.useState(false);

  async function handleSave() {
    setPending(true);
    try {
      const result = await updateNotificationPreferencesAction(values as unknown as Record<string, unknown>);
      if (result?.error) toast.error(result.error);
      else toast.success("Preferences saved");
    } catch {
      toast.error("Could not save preferences.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <Row label="WhatsApp" description="Class reminders, homework nudges, announcements." checked={values.whatsappEnabled} onCheckedChange={(v) => setValues((s) => ({ ...s, whatsappEnabled: v }))} />
        <Row label="Email" description="Weekly reports, reminders, and alerts your academy has enabled for email." checked={values.emailEnabled} onCheckedChange={(v) => setValues((s) => ({ ...s, emailEnabled: v }))} />
        <Row label="SMS" description="Future-ready — no SMS provider is wired in yet." checked={values.smsEnabled} onCheckedChange={(v) => setValues((s) => ({ ...s, smsEnabled: v }))} />
        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving…" : "Save Preferences"}
        </Button>
      </CardContent>
    </Card>
  );
}

function Row({ label, description, checked, onCheckedChange }: { label: string; description: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
      <div>
        <Label className="!mt-0">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
