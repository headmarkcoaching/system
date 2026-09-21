"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, X, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/utils";
import { createApiKeyAction, revokeApiKeyAction } from "./actions";

interface ApiKeyRow {
  id: string;
  label: string;
  keyPrefix: string;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  createdBy: { name: string };
}

export function ApiKeysView({ keys }: { keys: ApiKeyRow[] }) {
  const [label, setLabel] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [newKey, setNewKey] = React.useState<string | null>(null);

  async function handleCreate() {
    setPending(true);
    try {
      const result = await createApiKeyAction(label);
      if ("rawKey" in result && result.rawKey) {
        setNewKey(result.rawKey);
        setLabel("");
      } else if ("error" in result && result.error) {
        toast.error(result.error);
      }
    } catch {
      toast.error("Could not create key.");
    } finally {
      setPending(false);
    }
  }

  async function handleRevoke(id: string) {
    try {
      await revokeApiKeyAction(id);
      toast.success("Key revoked");
    } catch {
      toast.error("Could not revoke key.");
    }
  }

  return (
    <div className="space-y-6">
      {newKey && (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="text-base">New API Key — copy it now, it won&apos;t be shown again</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 text-sm">{newKey}</code>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(newKey);
                toast.success("Copied");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setNewKey(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create API Key</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label>Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Mobile App (staging)" className="w-64" />
          </div>
          <Button onClick={handleCreate} disabled={pending}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> {pending ? "Creating…" : "Create Key"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Keys</CardTitle>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <EmptyState title="No API keys yet" className="py-6" />
          ) : (
            <ul className="space-y-2">
              {keys.map((k) => (
                <li key={k.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium">
                      {k.label} <code className="text-xs text-muted-foreground">{k.keyPrefix}…</code>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created by {k.createdBy.name} on {formatDate(k.createdAt)}
                      {k.lastUsedAt ? ` · last used ${formatDate(k.lastUsedAt)}` : " · never used"}
                    </p>
                  </div>
                  {k.revokedAt ? <Badge variant="outline">Revoked</Badge> : <Button variant="ghost" size="sm" onClick={() => handleRevoke(k.id)}>Revoke</Button>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
