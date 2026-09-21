import { cn } from "@/lib/utils";

/** A soft dot-grid, faded out toward the edges via a mask so it reads as texture behind content
 * rather than a hard-edged tile. Purely decorative — always aria-hidden. */
export function DotGrid({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 text-primary", className)}
      style={{
        backgroundImage: "radial-gradient(currentColor 1.5px, transparent 1.5px)",
        backgroundSize: "26px 26px",
        maskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, black 30%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 0%, black 30%, transparent 100%)",
      }}
    />
  );
}

/** A large, near-invisible echo of the logo's achievement-mark checkmark — the one recurring
 * signature flourish used across hero/CTA bands so those moments feel unmistakably branded
 * rather than borrowed from a generic template. */
export function AchievementWatermark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 600 600" className={cn("pointer-events-none absolute", className)}>
      <path
        d="M105,390 L230,515 L455,220"
        fill="none"
        stroke="currentColor"
        strokeWidth="46"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
