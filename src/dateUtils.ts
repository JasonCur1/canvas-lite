// All dates are stored/passed as "YYYY-MM-DD" strings and compared as local dates.

export function todayStr(): string {
  return toDateStr(new Date());
}

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatFriendly(s: string | null): string {
  if (!s) return "No due date";
  const d = parseDateStr(s);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function daysBetween(a: string, b: string): number {
  const da = parseDateStr(a).getTime();
  const db = parseDateStr(b).getTime();
  return Math.round((db - da) / (1000 * 60 * 60 * 24));
}

export type DueBucket = "overdue" | "today" | "tomorrow" | "week" | "later" | "none";

export function bucketFor(dueDate: string | null, today: string = todayStr()): DueBucket {
  if (!dueDate) return "none";
  const diff = daysBetween(today, dueDate);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff <= 7) return "week";
  return "later";
}

export const BUCKET_LABEL: Record<DueBucket, string> = {
  overdue: "Overdue",
  today: "Due today",
  tomorrow: "Due tomorrow",
  week: "This week",
  later: "Later",
  none: "No due date",
};

export const BUCKET_ORDER: DueBucket[] = ["overdue", "today", "tomorrow", "week", "later", "none"];

export interface MonthCell {
  date: Date;
  dateStr: string;
  inCurrentMonth: boolean;
  isToday: boolean;
}

// Builds a 6-week grid (42 cells) for the given month, starting on Sunday.
export function buildMonthGrid(year: number, month: number): MonthCell[] {
  const today = todayStr();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  const cells: MonthCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const dateStr = toDateStr(d);
    cells.push({
      date: d,
      dateStr,
      inCurrentMonth: d.getMonth() === month,
      isToday: dateStr === today,
    });
  }
  return cells;
}

// Returns the 7 dates (Sun-Sat) of the week containing `d`.
export function buildWeekGrid(d: Date): MonthCell[] {
  const today = todayStr();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
  const cells: MonthCell[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const dateStr = toDateStr(day);
    cells.push({
      date: day,
      dateStr,
      inCurrentMonth: true,
      isToday: dateStr === today,
    });
  }
  return cells;
}

export function formatWeekRange(week: MonthCell[]): string {
  const start = week[0].date;
  const end = week[6].date;
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endLabel = sameMonth
    ? end.toLocaleDateString(undefined, { day: "numeric" })
    : end.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${startLabel} – ${endLabel}, ${end.getFullYear()}`;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
