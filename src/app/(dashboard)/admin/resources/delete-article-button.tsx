"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteArticleAction } from "./actions";

export function DeleteArticleButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function remove() {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setPending(true);
    try {
      const res = await deleteArticleAction(id);
      if (res.error) toast.error(res.error);
      else {
        toast.success("Article deleted");
        router.refresh();
      }
    } catch {
      toast.error("Couldn't delete the article. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={remove} disabled={pending} aria-label={`Delete ${title}`} className="text-destructive hover:text-destructive">
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
