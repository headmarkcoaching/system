/**
 * The viewer's own name and phone number, laid over a lecture or a set of notes. It can't stop
 * someone filming their screen, but anything they share carries their identity, which is the
 * deterrent that actually works. It never blocks taps: pointer events pass straight through.
 */
export function Watermark({ text, variant }: { text: string; variant: "video" | "document" }) {
  if (variant === "video") {
    return (
      <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="wm-drift absolute whitespace-nowrap text-xs font-semibold text-white/40 [text-shadow:0_1px_3px_rgba(0,0,0,0.85)] sm:text-sm"
            style={{ top: `${14 + i * 30}%`, animationDelay: `${-i * 8}s` }}
          >
            {text}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden">
      <div className="absolute -inset-1/4 flex -rotate-[22deg] flex-wrap content-around justify-around gap-x-10 gap-y-14 text-sm font-semibold text-foreground/[0.09]">
        {Array.from({ length: 40 }).map((_, i) => (
          <span key={i} className="whitespace-nowrap">
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
