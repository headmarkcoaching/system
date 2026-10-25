import Link from "next/link";
import { Noto_Nastaliq_Urdu } from "next/font/google";
import { cn } from "@/lib/utils";

// Nastaliq is the script Pakistani readers expect for Urdu (Naskh looks foreign to them). It is tall,
// so the bar gives its lines extra height instead of clipping them.
const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["500", "700"],
  display: "swap",
});

/** The brand name and "Board exams" stay in English inside the Urdu sentence, as the academy writes them. */
function Message() {
  return (
    <>
      داخلے جاری ہیں! اپنی مفت ٹرائل کلاس بُک کریں اور <bdi dir="ltr" className="font-sans font-bold">HMC</bdi> کے ساتھ اپنے آنے والے{" "}
      <bdi dir="ltr" className="font-sans font-bold">
        Board exams
      </bdi>{" "}
      کی بہترین تیاری کریں اور اچھے نمبر حاصل کریں۔
    </>
  );
}

/**
 * The strip at the very top of every public page: admissions are open, book a free trial. The message
 * scrolls in a loop (pausing under the pointer and for anyone who asked their device for less motion,
 * who instead get it as ordinary wrapped text). The whole strip links to the booking form.
 */
export function AnnouncementBar() {
  return (
    <div role="region" aria-label="Admissions" lang="ur" className={cn(nastaliq.className, "hmc-ticker bg-primary text-primary-foreground")}>
      <Link href="/enroll" className="mx-auto flex max-w-6xl items-center px-4 py-1 hover:opacity-95 sm:px-6" aria-label="Admissions are open. Book your free trial.">
        {/* Moving version. The container is left-to-right so the scrolling maths is plain; each message is right-to-left. */}
        <div dir="ltr" className="min-w-0 flex-1 overflow-hidden motion-reduce:hidden" aria-hidden="true">
          <div className="hmc-ticker-track flex w-max">
            {[0, 1].map((copy) => (
              <span key={copy} dir="rtl" className="shrink-0 whitespace-nowrap px-10 text-sm font-medium leading-[2.3] sm:text-base sm:leading-[2.4]">
                <Message />
              </span>
            ))}
          </div>
        </div>
        {/* Still version, for people who prefer reduced motion. */}
        <span dir="rtl" className="hidden min-w-0 flex-1 text-center text-sm font-medium leading-[2] motion-reduce:block">
          <Message />
        </span>
      </Link>
    </div>
  );
}
