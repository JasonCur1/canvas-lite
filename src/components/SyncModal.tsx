import { useEffect, useState } from "react";
import * as db from "../db";
import { findMatch, type ParsedIcsItem } from "../importIcs";
import {
  FEED_URL_KEY,
  LAST_SYNC_KEY,
  NO_COURSE_KEY,
  evaluateFeed,
  fetchFeed,
  type SyncSummary,
} from "../syncCalendar";
import { CLASS_COLORS, type ClassRow } from "../types";

interface Props {
  classes: ClassRow[];
  onClose: () => void;
  onChanged: () => void;
  onOpenFileImport: () => void;
  onStatus: (text: string) => void;
}

type Choice = number | "new" | "ignore";
interface MapChoice {
  choice: Choice;
  newName: string;
}

function formatWhen(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function SyncModal({ classes, onClose, onChanged, onOpenFileImport, onStatus }: Props) {
  const [url, setUrl] = useState("");
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SyncSummary | null>(null);

  const [pending, setPending] = useState<{ items: ParsedIcsItem[]; keys: string[] } | null>(null);
  const [choices, setChoices] = useState<Record<string, MapChoice>>({});

  useEffect(() => {
    (async () => {
      const [u, l] = await Promise.all([db.getSetting(FEED_URL_KEY), db.getSetting(LAST_SYNC_KEY)]);
      if (u) {
        setUrl(u);
        setSavedUrl(u);
      }
      setLastSync(l);
    })();
  }, []);

  async function finishOutcome(outcome: Awaited<ReturnType<typeof evaluateFeed>>) {
    if (outcome.kind === "needs_mapping") {
      const initial: Record<string, MapChoice> = {};
      for (const key of outcome.unmappedKeys) {
        const hint = key === NO_COURSE_KEY ? null : key;
        const match = findMatch(hint, classes);
        initial[key] = match
          ? { choice: match, newName: "" }
          : { choice: "new", newName: hint ?? "" };
      }
      setChoices(initial);
      setPending({ items: outcome.items, keys: outcome.unmappedKeys });
      return;
    }
    setPending(null);
    setSummary(outcome.summary);
    const l = await db.getSetting(LAST_SYNC_KEY);
    setLastSync(l);
    onStatus(`Synced ${formatWhen(l)}`);
    onChanged();
  }

  async function handleSync() {
    setBusy(true);
    setError(null);
    setSummary(null);
    try {
      const trimmed = url.trim();
      const items = await fetchFeed(trimmed);
      await db.setSetting(FEED_URL_KEY, trimmed);
      setSavedUrl(trimmed);
      await finishOutcome(await evaluateFeed(items));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      onStatus("Sync failed");
    } finally {
      setBusy(false);
    }
  }

  const mappingReady =
    pending !== null &&
    pending.keys.every((k) => choices[k]?.choice !== "new" || choices[k].newName.trim().length > 0);

  async function handleConfirmMapping() {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      let colorIndex = classes.length;
      const createdByName = new Map<string, number>();
      for (const key of pending.keys) {
        const c = choices[key];
        if (c.choice === "ignore") {
          await db.saveMapping(key, null);
        } else if (c.choice === "new") {
          const name = c.newName.trim();
          const lower = name.toLowerCase();
          let id = createdByName.get(lower);
          if (id === undefined) {
            id = await db.createClass(name, CLASS_COLORS[colorIndex % CLASS_COLORS.length].value, null);
            colorIndex += 1;
            createdByName.set(lower, id);
          }
          await db.saveMapping(key, id);
        } else {
          await db.saveMapping(key, c.choice);
        }
      }
      await finishOutcome(await evaluateFeed(pending.items));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveLink() {
    await db.setSetting(FEED_URL_KEY, null);
    await db.setSetting(LAST_SYNC_KEY, null);
    setUrl("");
    setSavedUrl(null);
    setLastSync(null);
    setSummary(null);
    onStatus("");
  }

  async function handleResetMatches() {
    await db.clearMappings();
    setSummary(null);
    setError(null);
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ width: pending ? 600 : 500 }} onMouseDown={(e) => e.stopPropagation()}>
        <h2>D2L calendar sync</h2>

        {pending ? (
          <>
            <p style={{ color: "var(--ink-soft)", fontSize: 13, marginBottom: 12 }}>
              Your calendar has courses I haven't seen before. Match each one to a class — I'll remember
              your choices, so future syncs file everything automatically.
            </p>
            <div style={{ maxHeight: "44vh", overflowY: "auto" }}>
              {pending.keys.map((key) => {
                const c = choices[key];
                const count = pending.items.filter((i) => (i.hint ?? NO_COURSE_KEY) === key).length;
                const examples = pending.items
                  .filter((i) => (i.hint ?? NO_COURSE_KEY) === key)
                  .slice(0, 2)
                  .map((i) => i.title);
                return (
                  <div key={key} style={{ padding: "9px 0", borderBottom: "1px solid var(--line)" }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 5 }}>
                      {key === NO_COURSE_KEY ? "Events with no course name" : key}
                      <span style={{ color: "var(--ink-soft)", fontWeight: 400 }}>
                        {" "}
                        · {count} item{count === 1 ? "" : "s"}
                      </span>
                    </div>
                    {examples.length > 0 && (
                      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 5 }}>
                        e.g. {examples.join(" · ")}
                        {count > examples.length ? "…" : ""}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6 }}>
                      <select
                        style={{ flex: 1, fontSize: 12.5, padding: "5px 6px" }}
                        value={String(c.choice)}
                        onChange={(e) => {
                          const v = e.target.value;
                          setChoices((prev) => ({
                            ...prev,
                            [key]: {
                              ...prev[key],
                              choice: v === "new" ? "new" : v === "ignore" ? "ignore" : Number(v),
                            },
                          }));
                        }}
                      >
                        <option value="ignore">Ignore this course</option>
                        {classes.map((cl) => (
                          <option key={cl.id} value={cl.id}>
                            {cl.name}
                          </option>
                        ))}
                        <option value="new">+ New class…</option>
                      </select>
                      {c.choice === "new" && (
                        <input
                          type="text"
                          placeholder="New class name"
                          style={{ flex: 1, fontSize: 12.5, padding: "5px 6px" }}
                          value={c.newName}
                          onChange={(e) =>
                            setChoices((prev) => ({ ...prev, [key]: { ...prev[key], newName: e.target.value } }))
                          }
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {error && <p style={{ fontSize: 13, color: "var(--danger)" }}>{error}</p>}
            <div className="modal-actions">
              <div />
              <div className="modal-actions-right">
                <button className="secondary-btn" onClick={() => setPending(null)}>
                  Back
                </button>
                <button
                  className="primary-btn"
                  disabled={!mappingReady || busy}
                  style={{ opacity: mappingReady && !busy ? 1 : 0.5 }}
                  onClick={handleConfirmMapping}
                >
                  {busy ? "Syncing…" : "Save & sync"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 14 }}>
              In D2L, open <strong>Calendar</strong>, click <strong>Subscribe</strong>, and copy the link it
              gives you. Paste it here and your due dates stay up to date — new assignments appear and
              changed dates update, while your own notes and checkmarks are left alone.
            </p>

            <div className="field">
              <label>Calendar subscription link</label>
              <input
                type="text"
                placeholder="https://… or webcal://…"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: -4, marginBottom: 12 }}>
              Treat this link like a password — anyone with it can see your calendar. It's stored only on
              this computer.
            </p>

            {savedUrl && (
              <p style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 10 }}>
                Last synced: {formatWhen(lastSync)}
              </p>
            )}
            {summary && (
              <p style={{ fontSize: 13.5, marginBottom: 10 }}>
                Sync complete — <strong>{summary.added}</strong> added, <strong>{summary.updated}</strong>{" "}
                updated
                {summary.missing > 0 && (
                  <>
                    , <strong>{summary.missing}</strong> no longer in the feed
                  </>
                )}
                .
              </p>
            )}
            {error && <p style={{ fontSize: 13, color: "var(--danger)", marginBottom: 10 }}>{error}</p>}

            <div className="modal-actions">
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                <button
                  className="text-btn"
                  style={{ padding: "2px 0" }}
                  onClick={() => {
                    onClose();
                    onOpenFileImport();
                  }}
                >
                  Import a .ics file instead
                </button>
                {savedUrl && (
                  <>
                    <button className="text-btn" style={{ padding: "2px 0" }} onClick={handleResetMatches}>
                      Reset course matches
                    </button>
                    <button className="text-btn danger" style={{ padding: "2px 0" }} onClick={handleRemoveLink}>
                      Remove link
                    </button>
                  </>
                )}
              </div>
              <div className="modal-actions-right">
                <button className="secondary-btn" onClick={onClose}>
                  Close
                </button>
                <button
                  className="primary-btn"
                  disabled={busy || url.trim().length === 0}
                  style={{ opacity: busy || url.trim().length === 0 ? 0.5 : 1 }}
                  onClick={handleSync}
                >
                  {busy ? "Syncing…" : savedUrl ? "Sync now" : "Connect & sync"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
