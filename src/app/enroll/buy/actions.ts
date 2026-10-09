"use server";

import { z } from "zod";
import * as leadService from "@/lib/services/leads";
import * as batchCatalogue from "@/lib/services/batch-catalogue";
import { checkRateLimit } from "@/lib/rate-limit";
import { monthlyFee, priceBandForLevel } from "@/lib/pricing";

const buySchema = z.object({
  batchId: z.string().min(1, "Please choose a batch"),
  studentName: z.string().trim().min(2, "Student name is required"),
  parentName: z.string().trim().min(2, "Parent name is required"),
  parentPhone: z.string().trim().min(7, "A valid phone number is required"),
});

export interface BuyState {
  error?: string;
  success?: boolean;
  summary?: { batchName: string; subjects: string[]; price: number };
}

/** No payment is taken here: there is no online gateway connected, so "Buy Now" records a
 * purchase request as a lead in the Payment Pending stage and a counselor confirms payment over
 * WhatsApp. The batch, subjects and fee are all re-derived on the server from ids, never read
 * from the form, so a visitor cannot choose their own price. */
export async function submitBuyAction(_prev: BuyState, formData: FormData): Promise<BuyState> {
  const parsed = buySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const subjectIds = Array.from(new Set(formData.getAll("subjectIds").map(String)));
  if (subjectIds.length === 0) return { error: "Please choose at least one subject" };

  const phoneRate = checkRateLimit(`buy:phone:${parsed.data.parentPhone.replace(/\D/g, "")}`, { windowMs: 60 * 60 * 1000, max: 3 });
  if (!phoneRate.allowed) return { error: "You've already submitted recently. Our team will be in touch shortly." };
  const globalRate = checkRateLimit("buy:global", { windowMs: 5 * 60 * 1000, max: 30 });
  if (!globalRate.allowed) return { error: "Something went wrong. Please try again in a few minutes." };

  const batch = await batchCatalogue.getOpenBatch(parsed.data.batchId);
  if (!batch) return { error: "This batch is no longer open for enrollment." };
  if (batch.seatsLeft === 0) return { error: "This batch just filled up. Message us on WhatsApp to join the waiting list." };

  const band = priceBandForLevel(batch.levelName);
  if (!band) return { error: "Please message us on WhatsApp for this class's fees." };

  const chosen = batch.subjects.filter((s) => subjectIds.includes(s.id));
  if (chosen.length !== subjectIds.length) return { error: "Those subjects are not part of this batch. Please choose again." };

  const price = monthlyFee(band, chosen.length, batch.subjects.length);
  if (price === null) {
    return { error: `Please choose 1, 2 or 3 subjects, or all ${batch.subjects.length} subjects of this batch.` };
  }

  const names = chosen.map((s) => s.name);
  try {
    await leadService.createLead({
      studentName: parsed.data.studentName,
      parentName: parsed.data.parentName,
      parentPhone: parsed.data.parentPhone,
      academicLevelId: batch.levelId,
      boardId: batch.boardId ?? undefined,
      groupId: batch.groupId ?? undefined,
      source: "WEBSITE",
      campaign: `buy-now:${chosen.length === batch.subjects.length && chosen.length > 3 ? "all" : chosen.length}`,
      stage: "PAYMENT_PENDING",
      notes: `Buy Now request. Batch: ${batch.name}. Subjects (${names.length}): ${names.join(", ")}. Fee: Rs ${price.toLocaleString("en-PK")} per month. Payment not yet received. Share payment details on WhatsApp.`,
    });
    return { success: true, summary: { batchName: batch.name, subjects: names, price } };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong. Please try again." };
  }
}
