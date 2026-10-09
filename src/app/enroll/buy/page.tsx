import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import * as batchCatalogue from "@/lib/services/batch-catalogue";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { isBundleKey, isPriceBand, priceBandForLevel } from "@/lib/pricing";
import { BuyForm, type BuyBatch } from "./buy-form";

export const metadata: Metadata = {
  title: "Buy Now",
  description: "Hold your seat in a Head Mark Coaching batch.",
  robots: { index: false, follow: false },
};

export default async function BuyPage({ searchParams }: { searchParams: { batch?: string; band?: string; bundle?: string } }) {
  const all = await batchCatalogue.listOpenBatches();

  // Only batches with a published fee can be bought online (Class 8 has none yet), and a seat
  // must be free. If the visitor came from a "Class 9 & 10" bundle card, show only that band.
  const wantedBand = isPriceBand(searchParams.band) ? searchParams.band : null;
  const batches: BuyBatch[] = all
    .map((b) => ({ b, band: priceBandForLevel(b.levelName) }))
    .filter(({ b, band }) => band !== null && b.seatsLeft > 0 && b.subjects.length > 0 && (!wantedBand || band === wantedBand))
    .map(({ b, band }) => ({
      id: b.id,
      name: b.name,
      meta: [b.levelName, b.boardName, b.groupName].filter(Boolean).join(" · "),
      band: band!,
      seatsLeft: b.seatsLeft,
      startLabel: `${b.isUpcoming ? "Starts" : "Started"} ${formatDate(b.startDate)}`,
      schedule: b.schedule,
      subjects: b.subjects,
    }));

  const initialBatchId = batches.find((b) => b.id === searchParams.batch)?.id ?? batches[0]?.id ?? "";
  const initialBundle = isBundleKey(searchParams.bundle) ? searchParams.bundle : null;

  return (
    <div className="theme-skylight flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-background px-4 py-4 sm:px-6">
        <Link href="/home" className="mx-auto flex w-fit max-w-md items-center">
          <Image src="/brand/head-mark-coaching-logo.png" alt="Head Mark Coaching" width={1564} height={1066} className="h-12 w-auto" priority />
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10">
        <Card className="w-full max-w-lg border-primary/10 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Hold your seat</CardTitle>
            <CardDescription>
              Choose a batch and your subjects, then send your details. Our team confirms payment with you on WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {batches.length === 0 ? (
              <p className="rounded-md bg-muted px-3 py-3 text-sm text-muted-foreground">
                No batch is open for online enrollment right now. Please{" "}
                <Link href="/pricing#batches" className="font-semibold text-primary hover:underline">
                  see the open batches
                </Link>{" "}
                or book a{" "}
                <Link href="/enroll" className="font-semibold text-primary hover:underline">
                  free demo class
                </Link>
                .
              </p>
            ) : (
              <BuyForm batches={batches} initialBatchId={initialBatchId} initialBundle={initialBundle} />
            )}

            <p className="text-center text-xs text-muted-foreground">
              <Link href="/pricing" className="hover:text-foreground hover:underline">
                Back to pricing
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
