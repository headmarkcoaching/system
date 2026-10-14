"use client";

import * as React from "react";
import { Maximize2 } from "lucide-react";
import { Watermark } from "./watermark";

/**
 * A lecture player that discourages saving: no download button, no right-click menu, no
 * picture-in-picture, and the viewer's name floating over the picture. If the server stops
 * serving the video (the viewer's 48 hours ended while they were watching) it says so instead of
 * showing a broken player.
 *
 * Full screen is done on this wrapper rather than the video itself, otherwise the watermark would
 * disappear the moment someone went full screen.
 */
export function ProtectedVideo({
  src,
  watermark,
  onTimeUpdate,
  onLoadedMetadata,
}: {
  src: string;
  watermark: string;
  onTimeUpdate?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onLoadedMetadata?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
}) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [failed, setFailed] = React.useState(false);
  const [canFullscreen, setCanFullscreen] = React.useState(false);

  React.useEffect(() => {
    setCanFullscreen(Boolean(document.fullscreenEnabled));
  }, []);

  return (
    <div ref={wrapperRef} className="relative overflow-hidden rounded-md bg-black" onContextMenu={(e) => e.preventDefault()}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        src={src}
        controls
        playsInline
        preload="metadata"
        controlsList={canFullscreen ? "nodownload nofullscreen noremoteplayback" : "nodownload noremoteplayback"}
        disablePictureInPicture
        className="w-full"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onError={() => setFailed(true)}
      />
      <Watermark text={watermark} variant="video" />
      {canFullscreen && (
        <button
          type="button"
          onClick={() => void wrapperRef.current?.requestFullscreen?.()}
          aria-label="Full screen"
          className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-md bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      )}
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 p-6 text-center text-sm text-white">
          This video can&apos;t be played any more. If your 48 hours have ended, it is locked.
        </div>
      )}
    </div>
  );
}
