import { CheckCircle2, Sparkles, Tag } from "lucide-react";
import type { Metadata } from "next";
import { PrimaryCta, SecondaryCta } from "@/components/marketing/cta-link";
import { SectionHeading } from "@/components/marketing/section-heading";
import { FaqList } from "@/components/marketing/faq-list";
import { DotGrid, AchievementWatermark } from "@/components/marketing/decorative";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent monthly pricing per student for Head Mark Coaching.",
  // This page is shared directly with leads after their trial, not meant for cold search/ad
  // discovery — keeping it out of search results protects the "try before you see numbers"
  // funnel the rest of the site is built around.
  robots: { index: false, follow: false },
};

const WHATSAPP_NUMBER = "923001234567";

const TIERS = [
  {
    name: "Basic",
    tagline: "Everything you need to get started.",
    matricPrice: 3000,
    intermediatePrice: 3500,
    features: [
      "All subjects included",
      "Live group classes with real teachers",
      "Real-time parent portal — attendance, homework, results",
      "Weekly updates on WhatsApp",
    ],
    highlighted: false,
  },
  {
    name: "Gold",
    tagline: "Everything in Basic, plus weekly testing.",
    matricPrice: 3500,
    intermediatePrice: 4000,
    features: [
      "All subjects included",
      "Live group classes with real teachers",
      "Real-time parent portal — attendance, homework, results",
      "Weekly updates on WhatsApp",
      "Weekly practice tests, results visible to you",
    ],
    highlighted: true,
  },
];

function waLink(text: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

const enrollText = (tier: string) => `Hi! I'd like to enroll in the ${tier} plan.`;
const askText = "Hi! I have a question about which plan fits my child.";

const PRICING_FAQS = [
  {
    q: "Is this per student, or per family?",
    a: "Per student. If you're enrolling more than one child, each is billed at the plan price for their own class level.",
  },
  {
    q: "What's the optional printed-notes subscription?",
    a: "Once your child is enrolled, you can subscribe to have official study notes printed and mailed to your home for Rs 1,500 per subject, per month. It's entirely optional and billed separately from your tuition plan.",
  },
  {
    q: "Can I cancel or switch plans later?",
    a: "Yes — there's no lock-in contract. You can cancel any time, and switching between Basic and Gold is just a conversation with us on WhatsApp.",
  },
];

export default function PricingPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-secondary/30 py-16 sm:py-20">
        <DotGrid className="h-full text-primary" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">
            <Tag aria-hidden="true" className="h-3.5 w-3.5" /> Pricing
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Ready to continue after your trial? Here&apos;s exactly what enrollment costs — per student, per month,
            no hidden fees.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          {TIERS.map((tier) => (
            <Card
              key={tier.name}
              className={
                tier.highlighted
                  ? "relative overflow-hidden border-2 border-primary shadow-2xl transition-all duration-300 lg:-translate-y-2 lg:scale-[1.04]"
                  : "border-border/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
              }
            >
              {tier.highlighted && (
                <>
                  <AchievementWatermark className="-right-10 -top-14 h-56 w-56 rotate-[8deg] text-primary/[0.06]" />
                  {/* A dedicated shade, not the bg-primary token — bg-primary's usual lightness
                      only reaches 4.27:1 against white text, which fails WCAG AA (4.5:1) at this
                      badge's small 12px bold size. This shade clears it at 5.66:1. */}
                  <span
                    className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold text-white shadow-sm"
                    style={{ backgroundColor: "hsl(216 51% 45%)" }}
                  >
                    <Sparkles aria-hidden="true" className="h-3.5 w-3.5" /> Most Popular
                  </span>
                </>
              )}
              <CardContent className="relative p-7 sm:p-8">
                <p className="font-display text-2xl font-bold">{tier.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{tier.tagline}</p>

                <div className="mt-7 grid grid-cols-2 divide-x divide-border overflow-hidden rounded-xl border border-border/60">
                  <div className="p-4 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Class 8&ndash;10</p>
                    <p className="mt-1.5 font-ledger text-3xl font-semibold tracking-tight tabular-nums text-primary sm:text-4xl">
                      {tier.matricPrice.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Rs / month</p>
                  </div>
                  <div className="p-4 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">1st &amp; 2nd Year</p>
                    <p className="mt-1.5 font-ledger text-3xl font-semibold tracking-tight tabular-nums text-primary sm:text-4xl">
                      {tier.intermediatePrice.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Rs / month</p>
                  </div>
                </div>

                <ul className="mt-6 space-y-2.5">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>

                <div className="mt-7">
                  {tier.highlighted ? (
                    <PrimaryCta href={waLink(enrollText(tier.name))} target="_blank" rel="noopener noreferrer" className="w-full">
                      Enroll in Gold
                    </PrimaryCta>
                  ) : (
                    <SecondaryCta href={waLink(enrollText(tier.name))} target="_blank" rel="noopener noreferrer" className="w-full">
                      Enroll in Basic
                    </SecondaryCta>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          A third plan is coming soon. Have questions about which plan fits? <br className="hidden sm:block" />
          <a href={waLink(askText)} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
            Message us on WhatsApp
          </a>{" "}
          and we&apos;ll help you decide.
        </p>

        <div className="mt-20">
          <SectionHeading eyebrow="Common questions" title="Before you enroll" />
          <div className="mt-10 mx-auto max-w-2xl">
            <FaqList items={PRICING_FAQS} />
          </div>
        </div>
      </div>
    </>
  );
}
