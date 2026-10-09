// The single source of truth for fees. Fees are monthly, per student, and depend on how many
// subjects the student takes. The pricing page, the batch catalogue and the Buy Now checkout
// all read from here, and the checkout recomputes the price on the server from the chosen
// subjects, so a price can never be supplied by the browser.
export type PriceBand = "matric" | "intermediate";
export type BundleKey = "1" | "2" | "3" | "all";

export const BANDS: { key: PriceBand; label: string; levels: string }[] = [
  { key: "matric", label: "Class 9 & 10", levels: "Class 9 and Class 10" },
  { key: "intermediate", label: "1st & 2nd Year", levels: "1st Year and 2nd Year" },
];

export interface Bundle {
  key: BundleKey;
  label: string;
  /** Number of subjects, or null for the all-subjects bundle. */
  subjects: number | null;
  prices: Record<PriceBand, number>;
}

// A 4-subject bundle is deliberately not offered. Class 8 has no published fee yet.
export const BUNDLES: Bundle[] = [
  { key: "1", label: "1 subject", subjects: 1, prices: { matric: 2500, intermediate: 3500 } },
  { key: "2", label: "2 subjects", subjects: 2, prices: { matric: 4000, intermediate: 5500 } },
  { key: "3", label: "3 subjects", subjects: 3, prices: { matric: 5500, intermediate: 7500 } },
  { key: "all", label: "All subjects", subjects: null, prices: { matric: 8000, intermediate: 11000 } },
];

/** How many subjects "all" means per band, where it is confirmed. Used only for the savings
 * line on the pricing page, never for billing. */
export const ALL_SUBJECT_COUNT: Partial<Record<PriceBand, number>> = { matric: 5 };

export function isBundleKey(value: string | undefined | null): value is BundleKey {
  return value === "1" || value === "2" || value === "3" || value === "all";
}

export function isPriceBand(value: string | undefined | null): value is PriceBand {
  return value === "matric" || value === "intermediate";
}

export function getBundle(key: BundleKey): Bundle {
  return BUNDLES.find((b) => b.key === key) ?? BUNDLES[0];
}

/** Class 9 and 10 are the matric band, 1st and 2nd Year the intermediate band. Anything else
 * (Class 8) has no published fee, so it returns null and the site sends the visitor to WhatsApp. */
export function priceBandForLevel(levelName: string): PriceBand | null {
  if (/year/i.test(levelName)) return "intermediate";
  if (/class\s*(9|10)\b/i.test(levelName)) return "matric";
  return null;
}

/** The monthly fee for a student taking `selected` of the batch's `available` subjects, or
 * null when that combination is not an offered bundle (for example 4 of 6, or none). */
export function monthlyFee(band: PriceBand, selected: number, available: number): number | null {
  if (selected < 1 || selected > available) return null;
  if (selected <= 3) return BUNDLES[selected - 1].prices[band];
  // Four or more subjects is only offered as "all subjects of the batch".
  return selected === available ? getBundle("all").prices[band] : null;
}

/** What the same subjects would cost bought one at a time, for the "you save" line. */
export function singleSubjectTotal(band: PriceBand, count: number): number {
  return getBundle("1").prices[band] * count;
}
