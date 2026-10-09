"use client";

import * as React from "react";
import { CheckCircle2, Sparkles, CalendarCheck2 } from "lucide-react";
import { PrimaryCta, SecondaryCta } from "@/components/marketing/cta-link";
import { Card, CardContent } from "@/components/ui/card";
import { BANDS, BUNDLES, ALL_SUBJECT_COUNT, singleSubjectTotal, type PriceBand } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const INCLUDED = [
  "Live group classes with real teachers",
  "Real-time parent portal: attendance, homework, results",
  "Weekly progress updates on WhatsApp",
  "Tests with question-by-question review",
  "Recordings if your child misses a class",
];

function formatRs(n: number) {
  return `Rs ${n.toLocaleString("en-PK")}`;
}

export function BundlePricing() {
  const [band, setBand] = React.useState<PriceBand>("matric");

  return (
    <div>
      <div className="flex justify-center">
        <div role="group" aria-label="Class level" className="inline-flex rounded-full border border-border bg-card p-1">
          {BANDS.map((b) => (
            <button
              key={b.key}
              type="button"
              aria-pressed={band === b.key}
              onClick={() => setBand(b.key)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                band === b.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4 lg:items-stretch">
        {BUNDLES.map((bundle) => {
          const price = bundle.prices[band];
          const count = bundle.subjects ?? ALL_SUBJECT_COUNT[band] ?? null;
          const saving = count && count > 1 ? singleSubjectTotal(band, count) - price : 0;
          const perSubject = count && count > 1 ? Math.round(price / count) : null;
          const best = bundle.key === "all";
          const href = `/enroll/buy?band=${band}&bundle=${bundle.key}`;
          return (
            <Card
              key={bundle.key}
              className={cn(
                "relative flex flex-col",
                best ? "border-2 border-primary shadow-xl" : "border-border/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              )}
            >
              {best && (
                <span
                  className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1 text-xs font-bold text-white shadow-sm"
                  style={{ backgroundColor: "hsl(216 51% 45%)" }}
                >
                  <Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> Best value
                </span>
              )}
              <CardContent className="flex flex-1 flex-col p-6 sm:p-6">
                <p className="font-display text-xl font-bold">
                  {bundle.key === "all" && count ? `All ${count} subjects` : bundle.label}
                </p>
                <p className="mt-4 font-ledger text-4xl font-semibold tracking-tight tabular-nums text-primary">{price.toLocaleString("en-PK")}</p>
                <p className="text-xs text-muted-foreground">Rs per month</p>

                <div className="mt-4 min-h-[2.75rem] space-y-0.5 text-sm text-muted-foreground">
                  {perSubject && <p>{formatRs(perSubject)} per subject</p>}
                  {saving > 0 && <p className="font-semibold text-success">Save {formatRs(saving)} a month</p>}
                  {!perSubject && bundle.key === "1" && <p>Pick the one subject that needs help.</p>}
                  {bundle.key === "all" && !count && <p>Every subject, one simple fee.</p>}
                </div>

                <div className="mt-auto pt-6">
                  {best ? (
                    <PrimaryCta href={href} className="w-full">
                      Buy Now
                    </PrimaryCta>
                  ) : (
                    <SecondaryCta href={href} className="w-full">
                      Buy Now
                    </SecondaryCta>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mx-auto mt-10 max-w-3xl rounded-2xl border border-border bg-card p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-primary">Every bundle includes</p>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {INCLUDED.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">Fees are per student, per month. Siblings are billed separately.</p>
      </div>
    </div>
  );
}

export function FreeDemoCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-cta/40 bg-cta-wash p-6 sm:p-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="stamp-badge flex h-14 w-14 shrink-0 -rotate-2 items-center justify-center rounded-lg border-[1.5px] border-cta/40 bg-card text-cta">
            <CalendarCheck2 aria-hidden="true" className="h-7 w-7" />
          </div>
          <div>
            <h3 className="font-display text-2xl font-bold">Not sure yet? Book a free demo class</h3>
            <p className="mt-1.5 max-w-xl text-muted-foreground">
              Sit in on a real live class with your child before you pay anything. No card, no commitment. Our admissions team
              will WhatsApp you to pick a time.
            </p>
          </div>
        </div>
        <PrimaryCta href="/enroll" className="shrink-0 self-start sm:self-center">
          Book Free Demo
        </PrimaryCta>
      </div>
    </div>
  );
}
