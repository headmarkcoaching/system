import { z } from "zod";

/**
 * What the public booking forms (free trial, Buy Now, referral link) all ask about the person filling them in:
 * whether they are a parent or the student, an optional email, and the names of other children in the family.
 */
export const FILLED_BY_ERROR = "Please tell us whether a parent or the student is filling in this form.";

export const filledBySchema = z.enum(["PARENT", "STUDENT"], { errorMap: () => ({ message: FILLED_BY_ERROR }) });

/** Email is optional: an empty box is fine, a filled one must look like an email address. */
export const optionalEmailSchema = z
  .string()
  .trim()
  .max(120, "That email address is too long")
  .optional()
  .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v), "That email address doesn't look right. Check it, or leave it blank.")
  .transform((v) => (v ? v : undefined));

export const MAX_SIBLINGS = 4;

/** The other children's names, only when the "another child" box was ticked. Blank entries are dropped. */
export function readSiblingNames(formData: FormData): { names: string[]; error?: string } {
  if (formData.get("sibling") !== "1") return { names: [] };
  const names = formData
    .getAll("siblingNames")
    .map((v) => String(v).replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (names.length === 0) return { names: [], error: "Please write the other child's name, or untick the box." };
  if (names.length > MAX_SIBLINGS) return { names: [], error: `You can add up to ${MAX_SIBLINGS} other children.` };
  if (names.some((n) => n.length < 2 || n.length > 60)) return { names: [], error: "Each child's name should be between 2 and 60 characters." };
  return { names: [...new Set(names)] };
}

/** What was typed, returned with an error because React empties an uncontrolled form after an action. */
export interface LeadFormValues {
  studentName: string;
  parentName: string;
  parentPhone: string;
  email: string;
}

export function typedValues(formData: FormData): LeadFormValues {
  const text = (k: string) => String(formData.get(k) ?? "");
  return { studentName: text("studentName"), parentName: text("parentName"), parentPhone: text("parentPhone"), email: text("email") };
}
