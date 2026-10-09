import { Tag } from "lucide-react";
import type { Metadata } from "next";
import { SectionHeading } from "@/components/marketing/section-heading";
import { FaqList } from "@/components/marketing/faq-list";
import { DotGrid } from "@/components/marketing/decorative";
import { BatchCatalogue } from "@/components/marketing/batch-catalogue";
import { BundlePricing, FreeDemoCard } from "@/components/marketing/bundle-pricing";
import * as batchCatalogue from "@/lib/services/batch-catalogue";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple monthly fees per student, based on how many subjects they take, for Head Mark Coaching.",
  // This page is shared directly with leads after their trial, not meant for cold search/ad
  // discovery — keeping it out of search results protects the "try before you see numbers"
  // funnel the rest of the site is built around.
  robots: { index: false, follow: false },
};

const WHATSAPP_NUMBER = "923001234567";

function waLink(text: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

const askText = "Hi! I have a question about which subjects and fee fit my child.";

const PRICING_FAQS = [
  {
    q: "Is this per student, or per family?",
    a: "Per student. The fee depends on how many subjects your child takes. If you're enrolling more than one child, each is billed on their own subjects.",
  },
  {
    q: "Which is better: separate subjects or the all-subjects bundle?",
    a: "Every extra subject costs less than the first one, so bundles always beat buying subjects one by one. If your child needs help in three or more subjects, ask us about the all-subjects bundle.",
  },
  {
    q: "What's the optional printed-notes subscription?",
    a: "Once your child is enrolled, you can subscribe to have official study notes printed and mailed to your home for Rs 1,500 per subject, per month. It's entirely optional and billed separately from your tuition fee.",
  },
  {
    q: "Can I cancel or change subjects later?",
    a: "Yes. There's no lock-in contract. You can cancel any time, and adding or dropping a subject is just a conversation with us on WhatsApp.",
  },
  {
    q: "What happens after I tap Buy Now?",
    a: "You choose your child's batch and subjects and send your details. Our admissions team then messages you on WhatsApp with payment details, and your seat is confirmed once payment is received. Nothing is charged on the website.",
  },
];

export default async function PricingPage() {
  const batches = await batchCatalogue.listOpenBatches();
  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-secondary/30 py-16 sm:py-20">
        <DotGrid className="h-full text-primary" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">
            <Tag aria-hidden="true" className="h-3.5 w-3.5" /> Pricing
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Pay only for the subjects you need
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            One subject or all of them. Fees are per student, per month, and the more subjects you take, the less each one
            costs.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <BundlePricing />

        <div className="mt-14">
          <FreeDemoCard />
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Class 8 fees differ. Not sure which subjects to pick? <br className="hidden sm:block" />
          <a href={waLink(askText)} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
            Message us on WhatsApp
          </a>{" "}
          and we&apos;ll help you decide.
        </p>

        <div id="batches" className="mt-20 scroll-mt-24">
          <SectionHeading
            eyebrow="Open batches"
            title="Or pick a batch and enroll"
            description="Every batch is a small live group. Choose a batch, pick your subjects, and tap Buy Now to hold your seat."
          />
          <BatchCatalogue batches={batches} whatsappNumber={WHATSAPP_NUMBER} />
        </div>

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
