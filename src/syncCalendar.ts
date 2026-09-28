import { fetch } from "@tauri-apps/plugin-http";
import * as db from "./db";
import { parseIcs, type ParsedIcsItem } from "./importIcs";

export const FEED_URL_KEY = "d2l_feed_url";
export const LAST_SYNC_KEY = "d2l_last_synced";
export const NO_COURSE_KEY = "__none__";

export interface SyncSummary {
  added: number;
  updated: number;
  missing: number;
}

export type SyncOutcome =
  | { kind: "needs_mapping"; items: ParsedIcsItem[]; unmappedKeys: string[] }
  | { kind: "done"; summary: SyncSummary };

// Calendar apps hand out "webcal://" links; they're plain https underneath.
export function normalizeFeedUrl(raw: string): string {
  return raw.trim().replace(/^webcal:\/\//i, "https://");
}

export function feedKey(item: ParsedIcsItem): string {
  return item.hint ?? NO_COURSE_KEY;
}

function uidFor(item: ParsedIcsItem): string {
  return item.uid ?? `synth:${feedKey(item)}|${item.title}|${item.dueDate ?? ""}`;
}

export async function fetchFeed(rawUrl: string): Promise<ParsedIcsItem[]> {
  const url = normalizeFeedUrl(rawUrl);
  if (!/^https:\/\//i.test(url)) {
    throw new Error("That doesn't look like a calendar link (it should start with https:// or webcal://).");
  }
  let text: string;
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) {
      throw new Error(`D2L answered with an error (${res.status}). The link may have expired or been turned off.`);
    }
    text = await res.text();
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("D2L answered")) throw e;
    throw new Error("Couldn't reach the calendar link. Check your internet connection and the link itself.");
  }
  const items = parseIcs(text);
  if (items.length === 0) {
    throw new Error("The link worked, but it contained no calendar events.");
  }
  return items;
}

// Applies a feed to the database. Every course in the feed must already have
// a saved mapping (to a class, or to "ignore").
async function applyFeed(items: ParsedIcsItem[]): Promise<SyncSummary> {
  const [mappings, assignments] = await Promise.all([db.listMappings(), db.listAssignments()]);
  const mappingByKey = new Map(mappings.map((m) => [m.hint, m.class_id]));
  const byUid = new Map(assignments.filter((a) => a.external_uid).map((a) => [a.external_uid!, a]));

  const seen = new Set<string>();
  const summary: SyncSummary = { added: 0, updated: 0, missing: 0 };

  for (const item of items) {
    const classId = mappingByKey.get(feedKey(item));
    if (classId === undefined || classId === null) continue; // ignored course

    const uid = uidFor(item);
    if (seen.has(uid)) continue;
    seen.add(uid);

    const existing = byUid.get(uid);
    if (existing) {
      const changed = existing.title !== item.title || existing.due_date !== item.dueDate;
      if (changed || existing.missing_from_feed) {
        await db.applyFeedFields(existing.id, item.title, item.dueDate);
      }
      if (changed) summary.updated += 1;
      continue;
    }

    // Adopt an assignment created earlier (manually or by file import)
    // rather than making a duplicate.
    const legacy = assignments.find(
      (a) =>
        !a.external_uid && a.class_id === classId && a.title === item.title && a.due_date === item.dueDate
    );
    if (legacy) {
      await db.adoptAssignment(legacy.id, uid);
      continue;
    }

    await db.createAssignment({
      class_id: classId,
      title: item.title,
      due_date: item.dueDate,
      status: "not_started",
      details: null,
      progress_notes: null,
      external_uid: uid,
    });
    summary.added += 1;
  }

  // Anything we previously synced that's no longer in the feed gets flagged,
  // not deleted, since the person may have notes on it.
  for (const a of assignments) {
    if (a.external_uid && !seen.has(a.external_uid) && !a.missing_from_feed) {
      await db.setMissingFromFeed(a.id, true);
      summary.missing += 1;
    }
  }

  await db.setSetting(LAST_SYNC_KEY, new Date().toISOString());
  return summary;
}

// Given parsed feed items, either applies them or reports which courses still
// need to be matched to a class.
export async function evaluateFeed(items: ParsedIcsItem[]): Promise<SyncOutcome> {
  const mappings = await db.listMappings();
  const mapped = new Set(mappings.map((m) => m.hint));
  const unmappedKeys = [...new Set(items.map(feedKey))].filter((k) => !mapped.has(k));
  if (unmappedKeys.length > 0) {
    return { kind: "needs_mapping", items, unmappedKeys };
  }
  return { kind: "done", summary: await applyFeed(items) };
}

export async function syncFeed(rawUrl: string): Promise<SyncOutcome> {
  const items = await fetchFeed(rawUrl);
  return evaluateFeed(items);
}
