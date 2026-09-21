"use client";

import * as React from "react";
import { toast } from "sonner";
import type { AutomationRuleKey } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { updateAutomationRuleAction } from "./actions";

export interface RuleFieldDef {
  name: string;
  label: string;
  type: "number" | "boolean";
}

export function RuleCard({
  ruleKey,
  name,
  description,
  isActive: initialActive,
  config: initialConfig,
  fields,
}: {
  ruleKey: AutomationRuleKey;
  name: string;
  description: string;
  isActive: boolean;
  config: Record<string, number>;
  fields: RuleFieldDef[];
}) {
  const [isActive, setIsActive] = React.useState(initialActive);
  const [config, setConfig] = React.useState(initialConfig);
  const [pending, setPending] = React.useState(false);

  async function handleSave() {
    setPending(true);
    try {
      const result = await updateAutomationRuleAction(ruleKey, { isActive, config });
      if (result?.error) toast.error(result.error);
      else toast.success(`${name} updated`);
    } catch {
      toast.error("Could not save changes.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">{name}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </CardHeader>
      {fields.length > 0 && (
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {fields.map((f) =>
            f.type === "boolean" ? (
              <div key={f.name} className="flex items-center gap-2">
                <Switch checked={!!config[f.name]} onCheckedChange={(v) => setConfig((c) => ({ ...c, [f.name]: v ? 1 : 0 }))} />
                <Label className="!mt-0">{f.label}</Label>
              </div>
            ) : (
              <div key={f.name} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Input
                  type="number"
                  min={0}
                  value={config[f.name] ?? 0}
                  onChange={(e) => setConfig((c) => ({ ...c, [f.name]: Number(e.target.value) }))}
                />
              </div>
            )
          )}
        </CardContent>
      )}
      <CardContent className={fields.length > 0 ? "pt-0" : undefined}>
        <Button size="sm" onClick={handleSave} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </CardContent>
    </Card>
  );
}
