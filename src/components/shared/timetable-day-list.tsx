"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { GridEntry } from "./weekly-timetable-grid";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
const SHORT: Record<(typeof DAYS)[number], string> = { MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed", THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun" };
const LONG: Record<(typeof DAYS)[number], string> = { MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday", THURSDAY: "Thursday", FRIDAY: "Friday", SATURDAY: "Saturday", SUNDAY: "Sunday" };

function formatTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * The phone version of the weekly timetable. The seven-column week grid needs about 760px, which on
 * a phone means scrolling sideways to find a class. This shows one day at a time instead: pick a
 * day, see that day's classes in order. It opens on today (or the next day that has classes).
 */
export function TimetableDayList({ entries, today, colors }: { entries: GridEntry[]; today: string; colors: Record<string, string> }) {
  const counts = DAYS.map((d) => entries.filter((e) => e.dayOfWeek === d).length);
  const firstWithClasses = DAYS.find((_, i) => counts[i] > 0);
  const initial = (DAYS as readonly string[]).includes(today) && counts[DAYS.indexOf(today as (typeof DAYS)[number])] > 0 ? today : firstWithClasses ?? "MONDAY";
  const [selected, setSelected] = React.useState<string>(initial);

  const items = entries
    .filter((e) => e.dayOfWeek === selected)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Day of the week" className="grid grid-cols-7 gap-1">
        {DAYS.map((d, i) => {
          const active = d === selected;
          return (
            <button
              key={d}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setSelected(d)}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg border text-xs font-semibold transition-colors",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground/80",
                !active && d === today && "border-primary/50 text-primary"
              )}
            >
              <span>{SHORT[d as (typeof DAYS)[number]]}</span>
              <span className={cn("h-1.5 w-1.5 rounded-full", counts[i] > 0 ? (active ? "bg-primary-foreground" : "bg-primary") : "bg-transparent")} />
            </button>
          );
        })}
      </div>

      <p className="px-1 text-sm font-semibold">
        {LONG[selected as (typeof DAYS)[number]]}
        {selected === today && <span className="ml-2 text-xs font-medium text-primary">Today</span>}
      </p>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">No classes on {LONG[selected as (typeof DAYS)[number]]}.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((e) => {
            const body = (
              <div className="flex gap-3 rounded-lg border border-border bg-card p-3 active:bg-muted/50">
                <span className="w-1.5 shrink-0 rounded-full" style={{ backgroundColor: colors[e.subjectId] }} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {formatTime(e.startTime)} – {formatTime(e.endTime)}
                  </p>
                  <p className="truncate text-base font-semibold">{e.title}</p>
                  {e.subtitle && <p className="truncate text-sm text-muted-foreground">{e.subtitle}</p>}
                </div>
              </div>
            );
            return <li key={e.id}>{e.href ? <a href={e.href}>{body}</a> : body}</li>;
          })}
        </ul>
      )}
    </div>
  );
}
