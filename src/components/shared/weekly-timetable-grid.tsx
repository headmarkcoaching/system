const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"] as const;
const DAY_LABELS: Record<(typeof DAYS)[number], string> = {
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
  SATURDAY: "Sat",
  SUNDAY: "Sun",
};
// JS Date#getDay(): 0=Sunday..6=Saturday — remap to our MONDAY-first DAYS order to highlight
// "today" the same way Google Calendar highlights the current day's column.
const JS_DAY_TO_NAME = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];

// Google Calendar's own default event-color palette (solid fill + white text), assigned by
// first-appearance order among the subjects actually on screen rather than a stored
// Subject.color field — no schema change, no staff-facing color picker to build/maintain, and
// every subject still gets a consistent color across every view. A hash-per-id approach was
// tried first but produced collisions (two different subjects landing on the same palette
// slot by chance); first-appearance order guarantees distinct colors as long as there are no
// more than PALETTE.length subjects in view, which comfortably covers a school's subject list.
const PALETTE = ["#3f51b5", "#039be5", "#0b8043", "#e67c73", "#8e24aa", "#f4511e", "#33b679", "#d50000", "#616161", "#7986cb"];

function buildColorMap(subjectIds: string[]) {
  const map = new Map<string, string>();
  let next = 0;
  for (const id of subjectIds) {
    if (!map.has(id)) {
      map.set(id, PALETTE[next % PALETTE.length]);
      next += 1;
    }
  }
  return map;
}

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function formatHourLabel(minutes: number) {
  const h = Math.floor(minutes / 60);
  if (h === 0 || h === 24) return "12 AM";
  if (h === 12) return "12 PM";
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

function formatTimeRange(startTime: string, endTime: string) {
  const fmt = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return m === 0 ? `${hour12} ${period}` : `${hour12}:${String(m).padStart(2, "0")} ${period}`;
  };
  return `${fmt(startTime)} – ${fmt(endTime)}`;
}

export interface GridEntry {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subjectId: string;
  title: string;
  subtitle?: string;
  href?: string;
}

const PIXELS_PER_HOUR = 60;

export function WeeklyTimetableGrid({ entries }: { entries: GridEntry[] }) {
  if (entries.length === 0) return null;

  const today = JS_DAY_TO_NAME[new Date().getDay()];

  const starts = entries.map((e) => toMinutes(e.startTime));
  const ends = entries.map((e) => toMinutes(e.endTime));
  const windowStart = Math.max(0, Math.floor(Math.min(...starts) / 60) * 60 - 60);
  const windowEnd = Math.min(24 * 60, Math.ceil(Math.max(...ends) / 60) * 60 + 60);
  const totalMinutes = Math.max(60, windowEnd - windowStart);
  const gridHeight = (totalMinutes / 60) * PIXELS_PER_HOUR;

  const hourMarks: number[] = [];
  for (let m = windowStart; m < windowEnd; m += 60) hourMarks.push(m);

  const byDay = DAYS.map((day) => ({ day, items: entries.filter((e) => e.dayOfWeek === day) }));
  const colorMap = buildColorMap(entries.map((e) => e.subjectId));

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <div className="grid min-w-[760px] grid-cols-[52px_repeat(7,1fr)]">
          <div className="sticky top-0 z-10 border-b border-border bg-card" />
          {DAYS.map((day) => (
            <div
              key={day}
              className={`sticky top-0 z-10 border-b border-l border-border bg-card py-2.5 text-center ${day === today ? "bg-primary/5" : ""}`}
            >
              <span className={`text-[11px] font-semibold uppercase tracking-wide ${day === today ? "text-primary" : "text-muted-foreground"}`}>
                {DAY_LABELS[day]}
              </span>
            </div>
          ))}

          <div className="relative" style={{ height: gridHeight }}>
            {hourMarks.map((m) => (
              <div key={m} className="absolute right-2 -translate-y-1/2 text-[10px] text-muted-foreground" style={{ top: ((m - windowStart) / 60) * PIXELS_PER_HOUR }}>
                {formatHourLabel(m)}
              </div>
            ))}
          </div>

          {byDay.map(({ day, items }) => (
            <div key={day} className={`relative border-l border-border ${day === today ? "bg-primary/5" : ""}`} style={{ height: gridHeight }}>
              {hourMarks.map((m) => (
                <div key={m} className="absolute left-0 right-0 border-t border-border" style={{ top: ((m - windowStart) / 60) * PIXELS_PER_HOUR }} />
              ))}
              {items.map((e) => {
                const top = ((toMinutes(e.startTime) - windowStart) / 60) * PIXELS_PER_HOUR;
                const height = Math.max(32, ((toMinutes(e.endTime) - toMinutes(e.startTime)) / 60) * PIXELS_PER_HOUR);
                const color = colorMap.get(e.subjectId) ?? PALETTE[0];
                const inner = (
                  <>
                    <p className="truncate text-[11px] font-semibold leading-tight">{e.title}</p>
                    <p className="truncate text-[10px] leading-tight text-white/85">{formatTimeRange(e.startTime, e.endTime)}</p>
                    {e.subtitle && <p className="truncate text-[10px] leading-tight text-white/85">{e.subtitle}</p>}
                  </>
                );
                const style = { top, height, backgroundColor: color };
                return e.href ? (
                  <a key={e.id} href={e.href} className="absolute inset-x-1 overflow-hidden rounded-md px-1.5 py-1 text-white shadow-sm transition-[filter] hover:brightness-110" style={style}>
                    {inner}
                  </a>
                ) : (
                  <div key={e.id} className="absolute inset-x-1 overflow-hidden rounded-md px-1.5 py-1 text-white shadow-sm" style={style}>
                    {inner}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
