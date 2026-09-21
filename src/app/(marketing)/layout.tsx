import { Fraunces, IBM_Plex_Mono } from "next/font/google";
import { MarketingHeader } from "./marketing-header";
import { MarketingFooter } from "./marketing-footer";
import { StickyCtaBar } from "@/components/marketing/sticky-cta-bar";
import { cn } from "@/lib/utils";

// The marketing site's own voice, distinct from the dashboard's Lexend (kept there deliberately
// for reading-proficiency reasons — see src/app/layout.tsx). Fraunces carries every headline as
// a warm, editorial serif instead of another SaaS sans — grounded in the brand's actual subject:
// report cards, mark sheets, and academic records have always been set in serif type. IBM Plex
// Mono renders every score, percentage, and price as a tabular ledger figure, not a UI number.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-marketing-display",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-marketing-mono",
  display: "swap",
});

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(fraunces.variable, plexMono.variable, "theme-skylight flex min-h-screen flex-col bg-background")}>
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
      <StickyCtaBar />
    </div>
  );
}
