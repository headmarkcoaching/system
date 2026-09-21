import Image from "next/image";
import { cn } from "@/lib/utils";

/** The Head Mark Coaching graduation-cap mark — cropped from the user's own Canva-designed
 * logo (public/brand/head-mark-coaching-icon.png), not a hand-drawn substitute. Rendered as a
 * raster PNG (transparent background, background-removed from the original white-background
 * export), since no vector source exists. */
export function HeadMarkEmblem({ className, priority }: { className?: string; priority?: boolean }) {
  return (
    <Image
      src="/brand/head-mark-coaching-icon.png"
      alt="Head Mark Coaching"
      width={512}
      height={512}
      priority={priority}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}
