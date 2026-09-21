"use client";

import * as React from "react";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { pingLiveClassPresenceAction } from "@/app/(dashboard)/student/actions";

const HEARTBEAT_INTERVAL_MS = 30_000;

// Opens the external meeting link and, while this tab stays open, pings the server every
// 30s so free/automated attendance can estimate how much of the class the student was
// actually active for. This is a proxy (tab open + focused), not proof of watching the
// meeting itself — see attendance-auto-detect.ts for how the estimate is finalized.
export function JoinLiveClassButton({ liveClassId, meetingLink }: { liveClassId: string; meetingLink: string }) {
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function handleClick() {
    window.open(meetingLink, "_blank", "noopener,noreferrer");
    if (intervalRef.current) return;
    pingLiveClassPresenceAction(liveClassId).catch(() => {});
    intervalRef.current = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      pingLiveClassPresenceAction(liveClassId).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);
  }

  return (
    <Button size="sm" onClick={handleClick}>
      <Video className="mr-1.5 h-3.5 w-3.5" /> Join Class — Live Now
    </Button>
  );
}
