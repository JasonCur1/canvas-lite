import { useState } from "react";
import type { AssignmentInput } from "../db";
import { STATUS_LABEL, type AssignmentRow, type ClassRow, type Status } from "../types";

interface Props {
  classes: ClassRow[];
  existing: AssignmentRow | null;
  defaultClassId?: number;
  defaultDueDate?: string;
  onClose: () => void;
  onSave: (input: AssignmentInput) => void;
  onDelete?: () => void;
}

export default function AssignmentModal({
  classes,
  existing,
  defaultClassId,
  defaultDueDate,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [title, setTitle] = useState(existing?.title ?? "");
  const [classId, setClassId] = useState<number>(
    existing?.class_id ?? defaultClassId ?? classes[0]?.id ?? 0
  );
  const [dueDate, setDueDate] = useState(existing?.due_date ?? defaultDueDate ?? "");
  const [status, setStatus] = useState<Status>(existing?.status ?? "not_started");
  const [details, setDetails] = useState(existing?.details ?? "");
  const [progressNotes, setProgressNotes] = useState(existing?.progress_notes ?? "");

  const canSave = title.trim().length > 0 && classId !== 0;

  function handleSave() {
    if (!canSave) return;
    onSave({
      class_id: classId,
      title: title.trim(),
      due_date: dueDate || null,
      status,
      details: details.trim() || null,
      progress_notes: progressNotes.trim() || null,
    });
  }

  if (classes.length === 0) {
    return (
      <div className="modal-backdrop" onMouseDown={onClose}>
        <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
          <h2>Add a class first</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 16 }}>
            You'll need at least one class before you can add assignments to it.
          </p>
          <div className="modal-actions">
            <div />
            <button className="secondary-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>{existing ? "Edit assignment" : "Add an assignment"}</h2>

        <div className="field">
          <label>Title</label>
          <input
            type="text"
            autoFocus
            placeholder="e.g. Problem Set 4"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label>Class</label>
            <select value={classId} onChange={(e) => setClassId(Number(e.target.value))}>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Due date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>Status</label>
          <div className="status-options">
            {(Object.keys(STATUS_LABEL) as Status[]).map((s) => (
              <button
                key={s}
                className={`status-pill ${status === s ? "active" : ""}`}
                onClick={() => setStatus(s)}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>Assignment specs / details</label>
          <textarea
            placeholder="What's actually being asked for..."
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Where I left off / what's left</label>
          <textarea
            placeholder="e.g. Finished parts 1-2, still need to write the conclusion"
            value={progressNotes}
            onChange={(e) => setProgressNotes(e.target.value)}
          />
        </div>

        <div className="modal-actions">
          <div>
            {existing && onDelete && (
              <button className="text-btn danger" onClick={onDelete}>
                Delete
              </button>
            )}
          </div>
          <div className="modal-actions-right">
            <button className="secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              className="primary-btn"
              disabled={!canSave}
              style={{ opacity: canSave ? 1 : 0.5 }}
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
