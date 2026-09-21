"use client";

import * as React from "react";
import { toast } from "sonner";
import { PlayCircle, CheckCircle2, Lock, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { recordVideoProgressAction, markRecordingCompleteAction, requestRecordingAccessAction } from "./actions";

const THROTTLE_MS = 5000;

interface Recording {
  id: string;
  title: string;
  recordingDate: Date;
  recordingUrl: string;
  isDirectVideo: boolean;
  progress: { completionPercent: number; completed: boolean; lastPositionSeconds: number } | null;
  access: { isLinked: boolean; eligible: boolean; activeUntil: Date | null };
}

function formatCountdown(until: Date) {
  const ms = until.getTime() - Date.now();
  if (ms <= 0) return "expired";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours >= 1) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

export function RecordingItem({ recording }: { recording: Recording }) {
  const [progress, setProgress] = React.useState(recording.progress);
  const [activeUntil, setActiveUntil] = React.useState(recording.access.activeUntil);
  const [pending, setPending] = React.useState(false);
  const [requesting, setRequesting] = React.useState(false);
  const lastReportRef = React.useRef(0);

  // Re-render every 30s so the countdown label stays roughly live without a full page refresh.
  const [, forceTick] = React.useState(0);
  React.useEffect(() => {
    if (!activeUntil) return;
    const id = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [activeUntil]);

  async function handleTimeUpdate(e: React.SyntheticEvent<HTMLVideoElement>) {
    const video = e.currentTarget;
    const now = Date.now();
    if (now - lastReportRef.current < THROTTLE_MS || !video.duration) return;
    lastReportRef.current = now;
    const result = await recordVideoProgressAction(recording.id, video.currentTime, video.duration);
    setProgress({ completionPercent: result.completionPercent, completed: result.completed, lastPositionSeconds: result.lastPositionSeconds });
  }

  async function handleMarkComplete() {
    setPending(true);
    try {
      await markRecordingCompleteAction(recording.id);
      setProgress({ completionPercent: 100, completed: true, lastPositionSeconds: 0 });
      toast.success("Marked as watched");
    } catch {
      toast.error("Couldn't update — please try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleRequest() {
    setRequesting(true);
    try {
      const result = await requestRecordingAccessAction(recording.id);
      setActiveUntil(new Date(result.expiresAt));
      toast.success("Recording unlocked for 48 hours");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't unlock this recording.");
    } finally {
      setRequesting(false);
    }
  }

  const unlocked = !recording.access.isLinked || (activeUntil && activeUntil > new Date());

  return (
    <li className="space-y-2 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{recording.title}</p>
          <p className="text-xs text-muted-foreground">{formatDate(recording.recordingDate)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {progress?.completed && (
            <Badge variant="success" className="gap-1">
              <CheckCircle2 className="h-3 w-3" /> Watched
            </Badge>
          )}

          {unlocked ? (
            <>
              {activeUntil && (
                <Badge variant="warning" className="gap-1">
                  <Clock className="h-3 w-3" /> {formatCountdown(activeUntil)}
                </Badge>
              )}
              {!recording.isDirectVideo && (
                <a href={recording.recordingUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <PlayCircle className="mr-1.5 h-3.5 w-3.5" /> Watch
                  </Button>
                </a>
              )}
              {!progress?.completed && (
                <Button variant="outline" size="sm" onClick={handleMarkComplete} disabled={pending}>
                  {pending ? "Saving…" : "Mark Complete"}
                </Button>
              )}
            </>
          ) : recording.access.eligible ? (
            <Button size="sm" onClick={handleRequest} disabled={requesting}>
              <Lock className="mr-1.5 h-3.5 w-3.5" /> {requesting ? "Unlocking…" : "Request Recording (48h)"}
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">Not available — only offered if you missed this class</span>
          )}
        </div>
      </div>

      {unlocked && recording.isDirectVideo && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <video
          src={recording.recordingUrl}
          controls
          controlsList="nodownload noremoteplayback"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          className="w-full rounded-md"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={(e) => {
            if (progress?.lastPositionSeconds) e.currentTarget.currentTime = progress.lastPositionSeconds;
          }}
        />
      )}

      {unlocked && progress && progress.completionPercent > 0 && progress.completionPercent < 100 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress.completionPercent}%` }} />
        </div>
      )}
    </li>
  );
}
