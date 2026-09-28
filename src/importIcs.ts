import type { ClassRow } from "./types";

// A small, dependency-free parser for the subset of iCalendar (RFC 5545)
// that D2L/Brightspace calendar exports actually use: VEVENT blocks with a
// SUMMARY and a DTSTART (all-day or timestamped). Good enough for importing
// due dates — not a general-purpose ICS library.

export interface ParsedIcsItem {
  title: string;
  dueDate: string | null; // YYYY-MM-DD
  hint: string | null; // best-guess course/class name, if we could find one
  uid: string | null; // stable event id from the feed, used for syncing
}

function unfoldLines(raw: string): string[] {
  const rawLines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const lines: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else if (line.length > 0) {
      lines.push(line);
    }
  }
  return lines;
}

function unescapeText(s: string): string {
  return s
    .replace(/\\n/gi, " ")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function extractDateDigits(value: string): string | null {
  // UTC timestamps (e.g. 20261006T035900Z) must be converted to the local
  // calendar day, or a late-night deadline lands on the wrong date.
  const utc = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (utc) {
    const d = new Date(Date.UTC(+utc[1], +utc[2] - 1, +utc[3], +utc[4], +utc[5], +utc[6]));
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  const match = value.match(/(\d{8})/);
  if (!match) return null;
  const digits = match[1];
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

// Tries to split a summary like "[CHEM110] Lab Report" into a class-name
// hint and the remaining title. Deliberately does NOT try to guess a course
// code from patterns like "Word Number - Title" (e.g. "Task 10 - Due",
// "Quiz 3 - Available") — that pattern is indistinguishable from a normal
// assignment title, and guessing wrong invents a fake "course" per event.
function splitHint(summary: string): { hint: string | null; title: string } {
  const bracket = summary.match(/^\s*\[([^\]]+)\]\s*(.+)$/);
  if (bracket) return { hint: bracket[1].trim(), title: bracket[2].trim() };
  return { hint: null, title: summary };
}

// The VCALENDAR-level name (when present) is a reliable fallback for feeds
// that are already scoped to a single course, so every event doesn't need
// its own per-item hint.
function extractCalendarName(lines: string[]): string | null {
  for (const line of lines) {
    const sep = line.indexOf(":");
    if (sep === -1) continue;
    const key = line.slice(0, sep).split(";")[0].toUpperCase();
    if (key === "X-WR-CALNAME") {
      const value = unescapeText(line.slice(sep + 1));
      return value.length > 0 ? value : null;
    }
  }
  return null;
}

export function parseIcs(raw: string): ParsedIcsItem[] {
  const lines = unfoldLines(raw);
  const calendarName = extractCalendarName(lines);
  const items: ParsedIcsItem[] = [];

  let inEvent = false;
  let props = new Map<string, string>();

  for (const line of lines) {
    if (line.toUpperCase().startsWith("BEGIN:VEVENT")) {
      inEvent = true;
      props = new Map();
      continue;
    }
    if (line.toUpperCase().startsWith("END:VEVENT")) {
      inEvent = false;
      const summaryRaw = props.get("SUMMARY");
      if (summaryRaw) {
        const summary = unescapeText(summaryRaw);
        const dtstart = props.get("DTSTART") ?? null;
        const categories = props.get("CATEGORIES") ?? null;
        const { hint: summaryHint, title } = splitHint(summary);
        items.push({
          title,
          dueDate: dtstart ? extractDateDigits(dtstart) : null,
          hint: summaryHint ?? (categories ? unescapeText(categories) : null) ?? calendarName,
          uid: props.get("UID")?.trim() || null,
        });
      }
      continue;
    }
    if (!inEvent) continue;

    const sep = line.indexOf(":");
    if (sep === -1) continue;
    const rawKey = line.slice(0, sep);
    const value = line.slice(sep + 1);
    const key = rawKey.split(";")[0].toUpperCase();
    props.set(key, value);
  }

  return items;
}

// Finds an existing class whose name matches a course hint from a feed.
export function findMatch(hint: string | null, classes: ClassRow[]): number | null {
  if (!hint) return null;
  const norm = hint.trim().toLowerCase();
  const exact = classes.find((c) => c.name.trim().toLowerCase() === norm);
  if (exact) return exact.id;
  const partial = classes.find(
    (c) => c.name.toLowerCase().includes(norm) || norm.includes(c.name.toLowerCase())
  );
  return partial ? partial.id : null;
}
