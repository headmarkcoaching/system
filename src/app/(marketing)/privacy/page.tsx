import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Head Mark Coaching collects, uses, and protects your family's information.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: September 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-foreground">
        <p>
          This page explains what information Head Mark Coaching collects when you book a trial class,
          refer a friend, or enroll your child, and how we use it. It&apos;s written in plain language rather than
          dense legal text — if anything here is unclear, message us on WhatsApp and we&apos;ll explain it directly.
        </p>

        <section>
          <h2 className="font-display text-lg font-bold">What we collect</h2>
          <p className="mt-2">
            When you book a free trial, refer a friend, or enroll your child, we collect: your child&apos;s name,
            your name, your phone/WhatsApp number, and the academic level (class/year) you&apos;re asking about. If
            your child enrolls, we also collect attendance, homework, test results, and payment records as part of
            running the coaching service and giving you visibility into their progress.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold">Why we collect it</h2>
          <p className="mt-2">
            To contact you about a trial class or enrollment, to run live classes and track attendance/homework/test
            results, to send you WhatsApp/SMS/email updates about your child&apos;s progress and fee status, and to
            operate the coaching service you&apos;ve signed up for. We do not sell your information to third parties,
            and we do not use it for advertising unrelated to Head Mark Coaching.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold">Who can see it</h2>
          <p className="mt-2">
            Academy staff involved in your child&apos;s education — admissions counselors, the teachers actually
            teaching your child&apos;s classes, and academy administrators. As the parent, you and anyone you&apos;ve
            linked to your child&apos;s account can see their own progress. Your child&apos;s data is not visible to
            other parents or students.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold">How long we keep it</h2>
          <p className="mt-2">
            We keep your information for as long as you or your child are engaging with the academy (as a lead, a
            trial student, or an enrolled student), and for a reasonable period afterward for record-keeping. If you
            want your information removed sooner, contact us and we&apos;ll act on that request.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold">Your choices</h2>
          <p className="mt-2">
            You can ask us at any time to tell you what information we hold about your family, to correct anything
            that&apos;s wrong, or to delete it (subject to any records we&apos;re required to keep for enrolled
            students, such as attendance and payment history). Reach out via the contact details below.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg font-bold">Contact us</h2>
          <p className="mt-2">
            Questions about this policy or your data: WhatsApp us at +92 300 1234567 or email
            hello@parentfirst.pk.
          </p>
        </section>

        <p className="rounded-lg border border-dashed border-border bg-muted/40 p-4 text-xs text-muted-foreground">
          Note: this is a plain-language summary written to be genuinely honest about our practices, not a
          substitute for formal legal advice. If you operate this academy and need this reviewed against Pakistani
          data-protection law before relying on it, have a lawyer check it — this hasn&apos;t been legally reviewed.
        </p>
      </div>
    </div>
  );
}
