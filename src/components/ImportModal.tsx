import { useState } from "react";
import * as db from "../db";
import { findMatch, parseIcs, type ParsedIcsItem } from "../importIcs";
import { CLASS_COLORS, type AssignmentRow, type ClassRow } from "../types";

interface Props {
  classes: ClassRow[];
  assignments: AssignmentRow[];
  onClose: () => void;
  onImported: () => void;
}

type ClassChoice = number | "new" | "skip";

interface ReviewRow extends ParsedIcsItem {
  id: number;
  include: boolean;
  classChoice: ClassChoice;
  newClassName: string;
  dueDateEdit: string; // yyyy-mm-dd for the <input type="date">
}

export default function ImportModal({ classes, assignments, onClose, onImported }: Props) {
  const [rows, setRows] = useState<ReviewRow[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ assignments: number; classes: number } | null>(null);

  function handleFile(file: File) {
    setError(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const parsed = parseIcs(text);
      if (parsed.length === 0) {
        setError(
          "No events found in that file. Make sure it's the .ics calendar export from D2L/Brightspace (Calendar → Subscribe/Export)."
        );
        setRows(null);
        return;
      }
      const built: ReviewRow[] = parsed.map((item, i) => {
        const matchId = findMatch(item.hint, classes);
        return {
          ...item,
          id: i,
          include: true,
          classChoice: matchId ?? "new",
          newClassName: matchId ? "" : item.hint ?? "",
          dueDateEdit: item.dueDate ?? "",
        };
      });
      setRows(built);
    };
    reader.onerror = () => setError("Couldn't read that file.");
    reader.readAsText(file);
  }

  function updateRow(id: number, patch: Partial<ReviewRow>) {
    setRows((prev) => (prev ? prev.map((r) => (r.id === id ? { ...r, ...patch } : r)) : prev));
  }

  const canImport =
    rows !== null &&
    rows.some((r) => r.include) &&
    rows
      .filter((r) => r.include)
      .every((r) => r.classChoice !== "new" || r.newClassName.trim().length > 0);

  async function handleImport() {
    if (!rows) return;
    setImporting(true);

    // Resolve "new class" rows into actual class ids, reusing one class per
    // distinct new name so five assignments for the same new class don't
    // create five classes.
    const newClassIds = new Map<string, number>();
    let classesCreated = 0;
    let colorIndex = classes.length;

    const included = rows.filter((r) => r.include && r.classChoice !== "skip");

    for (const r of included) {
      if (r.classChoice === "new") {
        const key = r.newClassName.trim().toLowerCase();
        if (!newClassIds.has(key)) {
          const color = CLASS_COLORS[colorIndex % CLASS_COLORS.length].value;
          colorIndex += 1;
          const id = await db.createClass(r.newClassName.trim(), color, null);
          newClassIds.set(key, id);
          classesCreated += 1;
        }
      }
    }

    let assignmentsCreated = 0;
    for (const r of included) {
      if (r.classChoice === "skip") continue;
      const classId =
        r.classChoice === "new" ? newClassIds.get(r.newClassName.trim().toLowerCase())! : r.classChoice;

      const dueDate = r.dueDateEdit || null;
      const alreadyExists = assignments.some(
        (a) =>
          (r.uid && a.external_uid === r.uid) ||
          (a.class_id === classId && a.title === r.title && a.due_date === dueDate)
      );
      if (alreadyExists) continue;

      await db.createAssignment({
        class_id: classId,
        title: r.title,
        due_date: dueDate,
        status: "not_started",
        details: null,
        progress_notes: null,
        external_uid: r.uid,
      });
      assignmentsCreated += 1;
    }

    setImporting(false);
    setResult({ assignments: assignmentsCreated, classes: classesCreated });
    onImported();
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal"
        style={{ width: rows ? 640 : 460 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2>Import from D2L</h2>

        {result ? (
          <>
            <p style={{ fontSize: 14, marginBottom: 18 }}>
              Imported <strong>{result.assignments}</strong> assignment
              {result.assignments === 1 ? "" : "s"}
              {result.classes > 0 && (
                <>
                  {" "}
                  and created <strong>{result.classes}</strong> new class
                  {result.classes === 1 ? "" : "es"}
                </>
              )}
              .
            </p>
            <div className="modal-actions">
              <div />
              <button className="primary-btn" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : !rows ? (
          <>
            <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 14 }}>
              In D2L/Brightspace, open <strong>Calendar</strong>, then use{" "}
              <strong>Subscribe</strong> or <strong>Export</strong> to download an{" "}
              <strong>.ics</strong> file of your assignments. Pick that file below.
            </p>
            <div className="field">
              <label>Calendar file (.ics)</label>
              <input
                type="file"
                accept=".ics,text/calendar"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>
            {fileName && !error && <p style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>Reading {fileName}…</p>}
            {error && <p style={{ fontSize: 13, color: "var(--danger)" }}>{error}</p>}
            <div className="modal-actions">
              <div />
              <button className="secondary-btn" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ color: "var(--ink-soft)", fontSize: 13, marginBottom: 12 }}>
              Found {rows.length} item{rows.length === 1 ? "" : "s"}. Review the class and due date
              for each, uncheck anything you don't want, then import.
            </p>
            <div style={{ maxHeight: "48vh", overflowY: "auto", marginBottom: 6 }}>
              {rows.map((r) => (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={r.include}
                    onChange={(e) => updateRow(r.id, { include: e.target.checked })}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflowWrap: "break-word" }}>
                      {r.title}
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 5 }}>
                      <select
                        style={{ flex: 1, fontSize: 12, padding: "4px 6px" }}
                        value={r.classChoice === "new" ? "new" : r.classChoice === "skip" ? "skip" : String(r.classChoice)}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateRow(r.id, {
                            classChoice: v === "new" ? "new" : v === "skip" ? "skip" : Number(v),
                          });
                        }}
                      >
                        <option value="skip">Don't import</option>
                        {classes.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                        <option value="new">+ New class…</option>
                      </select>
                      {r.classChoice === "new" && (
                        <input
                          type="text"
                          placeholder="New class name"
                          style={{ flex: 1, fontSize: 12, padding: "4px 6px" }}
                          value={r.newClassName}
                          onChange={(e) => updateRow(r.id, { newClassName: e.target.value })}
                        />
                      )}
                      <input
                        type="date"
                        style={{ fontSize: 12, padding: "4px 6px" }}
                        value={r.dueDateEdit}
                        onChange={(e) => updateRow(r.id, { dueDateEdit: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <div />
              <div className="modal-actions-right">
                <button className="secondary-btn" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="primary-btn"
                  disabled={!canImport || importing}
                  style={{ opacity: canImport && !importing ? 1 : 0.5 }}
                  onClick={handleImport}
                >
                  {importing ? "Importing…" : `Import ${rows.filter((r) => r.include).length}`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
