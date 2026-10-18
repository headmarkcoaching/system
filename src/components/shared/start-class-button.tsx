"use client";

import * as React from "react";
import { Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startZoomClassAction } from "@/app/(dashboard)/teacher/start-class-actions";

/**
 * Starts a Zoom class as its host. The host link comes from the server at the moment of pressing, so the
 * teacher never needs the Zoom account's login and the link can't be reused later.
 */
export function StartClassButton({ liveClassId, size = "sm" }: { liveClassId: string; size?: "sm" | "default" }) {
  const [pending, setPending] = React.useState(false);

  async function handleClick() {
    setPending(true);
    // Open the tab inside the tap so a phone browser doesn't block it as a pop-up.
    const tab = window.open("", "_blank");
    let result: { url?: string; error?: string };
    try {
      result = await startZoomClassAction(liveClassId);
    } catch {
      result = { error: "Couldn't start the class. Please try again." };
    } finally {
      setPending(false);
    }
    if (!result.url) {
      tab?.close();
      toast.error(result.error ?? "Couldn't start the class.");
      return;
    }
    if (tab) {
      tab.opener = null;
      tab.location.href = result.url;
    } else {
      window.location.href = result.url;
    }
    toast.success("Class started. Admit your students from the waiting room.");
  }

  return (
    <Button size={size} onClick={handleClick} disabled={pending}>
      <Video className="mr-1.5 h-3.5 w-3.5" /> {pending ? "Starting…" : "Start Class"}
    </Button>
  );
}
