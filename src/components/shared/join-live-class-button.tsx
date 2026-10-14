"use client";

import * as React from "react";
import { Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { pingLiveClassPresenceAction, getLiveClassJoinLinkAction } from "@/app/(dashboard)/student/actions";

const HEARTBEAT_INTERVAL_MS = 30_000;

// Opens the external meeting link and, while this tab stays open, pings the server every
// 30s so free/automated attendance can estimate how much of the class the student was
// actually active for. This is a proxy (tab open + focused), not proof of watching the
// meeting itself — see attendance-auto-detect.ts for how the estimate is finalized.
// The meeting link is not passed in: pressing the button asks the server, which checks the student's
// fees and batch first and only then returns it (see getLiveClassJoinLinkAction).
export function JoinLiveClassButton({ liveClassId }: { liveClassId: string }) {
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  async function handleClick() {
    setPending(true);
    // Open a blank tab right away, inside the tap, so a phone browser doesn't treat the link as a pop-up
    // and block it once the server has answered.
    const tab = window.open("", "_blank");
    let result: { url?: string; error?: string };
    try {
      result = await getLiveClassJoinLinkAction(liveClassId);
    } catch {
      result = { error: "Couldn't open the class. Please try again." };
    } finally {
      setPending(false);
    }
    if (!result.url) {
      tab?.close();
      toast.error(result.error ?? "You can't join this class right now.");
      return;
    }
    if (tab) {
      tab.opener = null;
      tab.location.href = result.url;
    } else {
      window.location.href = result.url;
    }
    if (intervalRef.current) return;
    pingLiveClassPresenceAction(liveClassId).catch(() => {});
    intervalRef.current = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      pingLiveClassPresenceAction(liveClassId).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);
  }

  return (
    <Button size="sm" onClick={handleClick} disabled={pending}>
      <Video className="mr-1.5 h-3.5 w-3.5" /> {pending ? "Opening…" : "Join Class — Live Now"}
    </Button>
  );
}
