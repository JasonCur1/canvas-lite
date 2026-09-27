// A small, dependency-free parser for the subset of iCalendar (RFC 5545)
// that D2L/Brightspace calendar exports actually use: VEVENT blocks with a
// SUMMARY and a DTSTART (all-day or timestamped). Good enough for importing
// due dates — not a general-purpose ICS library.

export interface ParsedIcsItem {
  title: string;
  dueDate: string | null; // YYYY-MM-DD
  hint: string | null; // best-guess course/class name, if we could find one
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
  const match = value.match(/(\d{8})/);
  if (!match) return null;
  const digits = match[1];
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

// Tries to split a summary like "PHYS 201: Problem Set 3" or
// "[CHEM110] Lab Report" into a class-name hint and the remaining title.
function splitHint(summary: string): { hint: string | null; title: string } {
  const bracket = summary.match(/^\s*\[([^\]]+)\]\s*(.+)$/);
  if (bracket) return { hint: bracket[1].trim(), title: bracket[2].trim() };

  const colon = summary.match(/^\s*([A-Za-z]{2,10}[\s-]?\d{2,4}[A-Za-z]?)\s*[:\-–]\s*(.+)$/);
  if (colon) return { hint: colon[1].trim(), title: colon[2].trim() };

  return { hint: null, title: summary };
}

export function parseIcs(raw: string): ParsedIcsItem[] {
  const lines = unfoldLines(raw);
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
          hint: summaryHint ?? (categories ? unescapeText(categories) : null),
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
