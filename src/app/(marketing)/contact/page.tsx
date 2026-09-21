import { Phone, Mail, MapPin, MessageCircle, Headset, ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import { IconBadge } from "@/components/marketing/icon-badge";
import { DotGrid } from "@/components/marketing/decorative";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Have a question before you book a trial? Reach Head Mark Coaching on WhatsApp, phone, or email.",
};

const WHATSAPP_NUMBER = "923001234567";
const CONTACT_METHODS = [
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "+92 300 1234567",
    href: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi! I'd like to know more about Head Mark Coaching.")}`,
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+92 300 1234567",
    href: "tel:+923001234567",
  },
  {
    icon: Mail,
    label: "Email",
    value: "hello@parentfirst.pk",
    href: "mailto:hello@parentfirst.pk",
  },
];

export default function ContactPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-border bg-secondary/30 py-16 sm:py-20">
        <DotGrid className="h-full text-primary" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">
            <Headset aria-hidden="true" className="h-3.5 w-3.5" /> Contact
          </span>
          <h1 className="mt-5 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">Talk to us first</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Have a question before you book a trial? Reach out however&apos;s easiest for you.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div>
            <div className="space-y-3">
              {CONTACT_METHODS.map((m) => (
                <a
                  key={m.label}
                  href={m.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-4 outline-none transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:p-5"
                >
                  <IconBadge icon={m.icon} />
                  <div className="flex-1">
                    <p className="font-display text-base font-bold">{m.label}</p>
                    <p className="text-sm text-muted-foreground">{m.value}</p>
                  </div>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 text-muted-foreground/50 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
                  />
                </a>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
              <IconBadge icon={MapPin} />
              <p className="text-sm text-muted-foreground">Islamabad, Pakistan — serving students online across all cities.</p>
            </div>
          </div>

          {/* A real conversation, not a stock illustration — the exact interaction a parent
              would actually have with us, in the interface they'd actually use. */}
          <div className="relative">
            <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-primary/10 blur-2xl" aria-hidden="true" />
            <Card className="overflow-hidden border-primary/10 shadow-2xl transition-transform duration-500 lg:-rotate-1 lg:hover:rotate-0">
              <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/40" aria-hidden="true" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/50" aria-hidden="true" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/50" aria-hidden="true" />
                <span className="ml-2.5 truncate text-xs font-medium text-muted-foreground">WhatsApp</span>
              </div>
              <CardContent className="space-y-3 p-6 pt-6 sm:p-7 sm:pt-7">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-secondary/60 px-4 py-2.5 text-sm">
                  Hi! I&apos;d like to know more about Head Mark Coaching.
                </div>
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                  Hi! Happy to help — which class is your child in?
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-secondary/60 px-4 py-2.5 text-sm">
                  Class 10, Punjab Board.
                </div>
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
                  Perfect — let&apos;s book a free trial class this week, no cost at all.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
