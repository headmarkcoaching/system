"use client";

import * as React from "react";
import { toast } from "sonner";
import { FileText, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { markStudyMaterialReadAction } from "./actions";

interface Material {
  id: string;
  title: string;
  chapter: string | null;
  type: string;
  fileId: string | null;
  fileUrl: string | null;
  mimeType: string | null;
  read: boolean;
}

export function MaterialItem({ material }: { material: Material }) {
  const [read, setRead] = React.useState(material.read);
  const [pending, setPending] = React.useState(false);
  const [showing, setShowing] = React.useState(false);

  async function handleMarkRead() {
    setPending(true);
    try {
      await markStudyMaterialReadAction(material.id);
      setRead(true);
      toast.success("Marked as read");
    } catch {
      toast.error("Couldn't update — please try again.");
    } finally {
      setPending(false);
    }
  }

  const isPdf = material.mimeType === "application/pdf";
  const isImage = material.mimeType?.startsWith("image/") ?? false;
  const viewUrl = material.fileId ? `/api/files/${material.fileId}` : null;

  return (
    <li className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">{material.title}</p>
          <p className="text-xs text-muted-foreground">{material.chapter ?? material.type}</p>
        </div>
        <div className="flex items-center gap-2">
          {read && (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> Read
            </Badge>
          )}

          {viewUrl ? (
            <Button variant="outline" size="sm" onClick={() => setShowing((s) => !s)}>
              {showing ? <EyeOff className="mr-1.5 h-3.5 w-3.5" /> : <Eye className="mr-1.5 h-3.5 w-3.5" />}
              {showing ? "Hide" : "View"}
            </Button>
          ) : (
            // Legacy, pasted-link material predates the switch to hosted files — best-effort
            // only, the app has no control over how the external site serves it.
            material.fileUrl && (
              <a href={material.fileUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <FileText className="mr-1.5 h-3.5 w-3.5" /> Open
                </Button>
              </a>
            )
          )}

          {!read && (
            <Button variant="outline" size="sm" onClick={handleMarkRead} disabled={pending}>
              {pending ? "Saving…" : "Mark Read"}
            </Button>
          )}
        </div>
      </div>

      {showing && viewUrl && (
        <div onContextMenu={(e) => e.preventDefault()} className="overflow-hidden rounded-md border border-border">
          {isPdf && <iframe src={`${viewUrl}#toolbar=0`} className="h-[70vh] w-full" title={material.title} />}
          {isImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={viewUrl} alt={material.title} draggable={false} className="w-full select-none" />
          )}
        </div>
      )}
    </li>
  );
}
