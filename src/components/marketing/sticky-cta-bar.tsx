"use client";

import * as React from "react";
import { PrimaryCta } from "./cta-link";

/** Mobile-only, appears once the visitor has scrolled past the hero's own CTA — so it's a second
 * chance to convert on the way out, not a duplicate fighting the hero for attention on load. */
export function StickyCtaBar() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => {
      const nearBottom = window.scrollY + window.innerHeight > document.body.scrollHeight - 500;
      setVisible(window.scrollY > 480 && !nearBottom);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-3 backdrop-blur-md transition-transform duration-300 md:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <PrimaryCta href="/enroll" className="w-full">
        Book a Free Trial Class
      </PrimaryCta>
    </div>
  );
}
