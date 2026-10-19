/**
 * Spots phone numbers, email addresses and "talk to me elsewhere" invitations in a piece of text, so
 * students, parents and teachers cannot move a conversation (or a student) outside the academy.
 *
 * It is deliberately strict about what looks like a phone number (nine or more digits, however they are
 * spaced, written in Urdu/Arabic digits, or spelled out) and about messaging apps. A message that trips it is
 * refused with a plain explanation, so an honest false alarm is one reworded sentence away.
 * No filter stops a determined person (a photo of a number can't be read, for example); this closes the
 * easy routes, and every refusal is recorded for the admins.
 */

export type ContactKind = "phone" | "email" | "app";

const DIGIT_WORDS: Record<string, string> = { zero: "0", oh: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9" };

function normalise(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    // Arabic-Indic (٠-٩) and Persian/Urdu (۰-۹) digits -> 0-9
    .replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    // zero-width characters people use to break a number up
    .replace(/[\u200b-\u200f\u2060\ufeff]/g, "");
}

/** "zero three zero four" -> "0304", so a number spelled out in words still counts. */
function wordsToDigits(text: string): string {
  return text.replace(/\b(zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/g, (w) => DIGIT_WORDS[w]);
}

const MIN_PHONE_DIGITS = 9;

function hasPhoneNumber(input: string): boolean {
  // A long decimal such as 3.14159265358 is maths, not a phone number: drop the fraction part of numbers like that.
  const text = input.replace(/(?<!\d)\d{1,2}\.\d{6,}/g, " ");
  // digits separated by spaces, dashes, brackets, slashes or a plus sign: 0300 1234567, 0300-123-4567, +92 300 ...
  for (const run of text.matchAll(/\+?\d(?:[\s\-_()/+]*\d)+/g)) {
    if (run[0].replace(/\D/g, "").length >= MIN_PHONE_DIGITS) return true;
  }
  // dotted groups such as 0300.123.4567 (a long single decimal like 3.14159265358 is NOT a phone number)
  for (const run of text.matchAll(/\d{1,4}(?:\.\d{1,4}){2,}/g)) {
    if (run[0].replace(/\D/g, "").length >= MIN_PHONE_DIGITS) return true;
  }
  return false;
}

const EMAIL = /[\w.+-]+\s*(?:@|\(\s*at\s*\)|\[\s*at\s*\]|\{\s*at\s*\})\s*[\w-]+\s*(?:\.|\(\s*dot\s*\)|\[\s*dot\s*\]|\s+dot\s+)\s*[a-z]{2,}/;
const MAIL_PROVIDER = /\b(?:gmail|g-mail|yahoo|hotmail|outlook|icloud|protonmail)\b/;
const APPS = /\b(?:whats\s?app|whatsap|watsapp|wa\.me|telegram|t\.me|instagram|insta\s?gram|snap\s?chat|viber|signal\s+app|facebook|messenger|tiktok|discord|skype|imo)\b/;
const LINKS = /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|pk|me|net|org|io|ly|gl)\b\/?)/;
const INVITES = /\b(?:call\s+me|ring\s+me|phone\s+me|text\s+me|dm\s+me|inbox\s+me|message\s+me\s+(?:on|at)|my\s+(?:phone\s+)?(?:number|no\.?|cell|mobile|contact)|your\s+(?:phone\s+)?(?:number|cell|mobile)|(?:contact|reach)\s+me\s+(?:on|at|outside|directly))\b/;

export function findSharedContact(text: string): ContactKind | null {
  const base = normalise(text);
  const withWords = wordsToDigits(base);
  if (hasPhoneNumber(base) || hasPhoneNumber(withWords)) return "phone";
  // Spelled-out digits written one after another ("zero three zero four one nine ...") become digit runs above;
  // also catch them when words and digits are mixed.
  if (EMAIL.test(base) || MAIL_PROVIDER.test(base)) return "email";
  if (APPS.test(base) || LINKS.test(base) || INVITES.test(base)) return "app";
  return null;
}

export const CONTACT_BLOCK_MESSAGE =
  "For everyone's safety, phone numbers, email addresses, social media and messaging apps can't be shared here. Please keep the conversation on the academy's platform. If you need to reach someone, contact the academy office.";
