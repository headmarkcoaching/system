import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, MapPin } from "lucide-react";
import { PrimaryCta } from "@/components/marketing/cta-link";
import { AchievementWatermark } from "@/components/marketing/decorative";

export function MarketingFooter() {
  return (
    <footer>
      <div className="relative overflow-hidden bg-primary py-14 text-primary-foreground">
        <AchievementWatermark className="-right-16 -top-20 h-72 w-72 rotate-[8deg] text-white/[0.07] sm:h-96 sm:w-96" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-5 px-4 text-center sm:px-6">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to see it for yourself?
          </h2>
          <p className="max-w-md text-primary-foreground/85">
            Book a free trial class today — no cost, no commitment.
          </p>
          <PrimaryCta href="/enroll" size="lg">
            Book a Free Trial Class
          </PrimaryCta>
        </div>
      </div>

      <div className="border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <Image
                src="/brand/head-mark-coaching-logo.png"
                alt="Head Mark Coaching"
                width={1564}
                height={1066}
                className="h-14 w-auto"
              />
              <p className="mt-3 text-sm text-muted-foreground">
                Live group classes for Class 8 through 2nd Year, with real-time parent visibility into attendance, homework, and results.
              </p>
            </div>

            <div>
              <p className="text-sm font-bold">Quick Links</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li><Link href="/home" className="hover:text-primary">Home</Link></li>
                <li><Link href="/programs" className="hover:text-primary">Programs</Link></li>
                <li><Link href="/about" className="hover:text-primary">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-primary">Contact</Link></li>
                <li><Link href="/enroll" className="hover:text-primary">Book a Free Trial</Link></li>
                <li><Link href="/login" className="hover:text-primary">Parent / Student Login</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-bold">Get In Touch</p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                  <span>+92 300 1234567</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                  <span>hello@parentfirst.pk</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                  <span>Islamabad, Pakistan</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Head Mark Coaching. All rights reserved.</span>
            <span className="flex gap-4">
              <Link href="/privacy" className="hover:text-primary">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-primary">Terms of Service</Link>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
