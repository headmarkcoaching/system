import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that apply when you book a trial or enroll with Head Mark Coaching.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: September 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground">
        <p>
          These terms apply when you book a free trial class or enroll your child with Head Mark Coaching.
          They&apos;re written plainly rather than in dense legal language — message us on WhatsApp if anything here
          needs clarifying.
        </p>

        <section>
          <h2 className="font-display text-lg font-bold">The free trial</h2>
          <p className="mt-2">
            A trial class is free and comes with no obligation to continue. Booking a trial does not create a
            payment obligation — that only begins if and when you choose to enroll.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold">Enrollment and fees</h2>
          <p className="mt-2">
            Once you enroll, fee amounts, billing frequency, and payment methods are agreed directly with our
            admissions team and confirmed to you before your first payment is due — we don&apos;t charge anything
            you haven&apos;t agreed to in advance.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold">Classes and attendance</h2>
          <p className="mt-2">
            Classes are live and delivered on the schedule shared with you at enrollment. We track attendance and
            homework completion and make that visible to you as a parent — this is a core part of what we offer, not
            an optional extra.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold">No guaranteed results</h2>
          <p className="mt-2">
            We&apos;re committed to real teaching, real accountability, and real visibility — but we cannot guarantee
            specific grades or exam outcomes for any student, since results depend on many factors beyond our
            classes alone.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold">Cancellation</h2>
          <p className="mt-2">
            You can stop at any time during the trial with no cost. Students who pay month by month can stop at any
            time. For other cancellation and refund terms, our admissions team confirms them with you directly at the
            time of enrollment.
          </p>
          <p className="mt-2">
            <strong className="text-foreground">Advance payments.</strong> If you paid 6 months in advance and ask for a
            refund, we deduct the months already used at the normal monthly fee, without any discount, and refund the
            remaining payment. A month counts in full if the refund is requested after the 10th of that month (a request
            on 11 November means all of November is deducted). If the months used cost as much as was paid or more, there is no
            refund and nothing further is owed. Refunds take 1 month to process.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold">Conduct</h2>
          <p className="mt-2">
            We expect students and parents to engage respectfully with teachers, staff, and other students. We
            reserve the right to pause or end a student&apos;s access to classes in cases of serious misconduct.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold">Contact us</h2>
          <p className="mt-2">
            Questions about these terms: WhatsApp us at +92 300 1234567 or email hello@parentfirst.pk.
          </p>
        </section>

        <p className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-xs text-muted-foreground">
          Note: this is a plain-language draft written to honestly reflect how the academy operates today, not a
          substitute for formal legal advice. If you operate this academy, have a lawyer review this — particularly
          the fee, refund, and liability sections — before relying on it as a binding agreement.
        </p>
      </div>
    </div>
  );
}
