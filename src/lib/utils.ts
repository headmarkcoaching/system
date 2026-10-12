import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatTime(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function formatPKR(amount: number | string) {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", maximumFractionDigits: 0 }).format(n);
}

// Class times are Pakistan wall-clock times. Pakistan is UTC+5 all year (no daylight saving).
const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;

// Merges a LiveClass's `scheduledDate` (stored as midnight UTC of the calendar day) with its
// `startTime`/`endTime` ("HH:mm" strings, Pakistan time) into the real moment, as a Date. Used both
// to gate presence pings to a class's actual window and to finalize attendance once it has passed.
// This used to read the time in the server's own timezone, which is right on a Pakistani computer
// but five hours off on a UTC host such as Vercel.
export function combineDateAndTime(date: Date, time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hours, minutes) - PKT_OFFSET_MS);
}

// The range of `scheduledDate` values that count as "today" in Pakistan, whatever timezone the
// server runs in. Class dates are midnight UTC of their calendar day, so this is today's Pakistani
// calendar date as a UTC-midnight to UTC-midnight range.
export function pakistanTodayRange(now = new Date()) {
  const pk = new Date(now.getTime() + PKT_OFFSET_MS);
  const start = new Date(Date.UTC(pk.getUTCFullYear(), pk.getUTCMonth(), pk.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}
