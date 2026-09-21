"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Fades a section up into place as it scrolls into view. Defaults to visible — safe for SSR
 * and for JS-disabled clients — and only hides itself after confirming, on mount, that the
 * element isn't already on screen; a below-the-fold element then reveals once it scrolls in.
 * `prefers-reduced-motion` is handled globally in globals.css (forces near-zero transition
 * duration), so this component doesn't need its own motion check. */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const alreadyVisible = el.getBoundingClientRect().top < window.innerHeight * 0.9;
    if (alreadyVisible) return;

    setVisible(false);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
