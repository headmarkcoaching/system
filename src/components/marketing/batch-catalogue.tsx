import { CalendarDays, Clock, Users } from "lucide-react";
import { PrimaryCta, SecondaryCta } from "@/components/marketing/cta-link";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { BUNDLES, priceBandForLevel } from "@/lib/pricing";
import type { CatalogueBatch } from "@/lib/services/batch-catalogue";

const waitlistText = (batch: string) => `Hi! ${batch} is full. Please add my child to the waiting list.`;
const feeText = (batch: string) => `Hi! What are the fees for ${batch}?`;

export function BatchCatalogue({ batches, whatsappNumber }: { batches: CatalogueBatch[]; whatsappNumber: string }) {
  if (batches.length === 0) {
    return (
      <p className="mx-auto mt-10 max-w-md rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No batches are open for enrollment right now. Message us on WhatsApp and we&apos;ll tell you when the next one starts.
      </p>
    );
  }

  const wa = (text: string) => `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(text)}`;

  return (
    <div className="mt-10 grid gap-6 md:grid-cols-2">
      {batches.map((batch) => {
        const full = batch.seatsLeft === 0;
        const band = priceBandForLevel(batch.levelName);
        const meta = [batch.levelName, batch.boardName, batch.groupName].filter(Boolean);
        return (
          <Card key={batch.id} className="flex flex-col border-border/60 transition-shadow duration-300 hover:shadow-md">
            <CardContent className="flex flex-1 flex-col gap-5 p-6 sm:p-6">
              <div>
                <span
                  className={
                    full
                      ? "inline-block rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground"
                      : batch.seatsLeft <= 5
                        ? "inline-block rounded-full bg-warning/15 px-2.5 py-1 text-xs font-bold text-warning"
                        : "inline-block rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary"
                  }
                >
                  {full ? "Batch full" : `${batch.seatsLeft} seat${batch.seatsLeft === 1 ? "" : "s"} left`}
                </span>
                <h3 className="mt-3 font-display text-xl font-bold leading-tight">{batch.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{meta.join(" · ")}</p>
              </div>

              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CalendarDays aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                  {batch.isUpcoming ? "Starts" : "Started"} {formatDate(batch.startDate)}
                </li>
                {batch.schedule && (
                  <li className="flex items-center gap-2">
                    <Clock aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                    {batch.schedule}
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <Users aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                  Small live group
                </li>
              </ul>

              {batch.subjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {batch.subjects.map((s) => (
                    <span key={s.id} className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
                      {s.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-auto flex items-center justify-between gap-3 border-t border-dashed border-border pt-5">
                {full ? (
                  <SecondaryCta href={wa(waitlistText(batch.name))} target="_blank" rel="noopener noreferrer" className="w-full">
                    Join the waiting list
                  </SecondaryCta>
                ) : band ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      From{" "}
                      <span className="font-ledger text-lg font-semibold tabular-nums text-foreground">
                        Rs {BUNDLES[0].prices[band].toLocaleString("en-PK")}
                      </span>{" "}
                      / month
                    </p>
                    <PrimaryCta href={`/enroll/buy?batch=${batch.id}`} className="shrink-0 !px-5 !py-2.5 !text-sm">
                      Buy Now
                    </PrimaryCta>
                  </>
                ) : (
                  <SecondaryCta href={wa(feeText(batch.name))} target="_blank" rel="noopener noreferrer" className="w-full">
                    Ask us for the fees
                  </SecondaryCta>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
