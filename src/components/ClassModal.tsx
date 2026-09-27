import { useState } from "react";
import { CLASS_COLORS, type ClassRow } from "../types";

interface Props {
  existing: ClassRow | null;
  onClose: () => void;
  onSave: (name: string, color: string, term: string | null) => void;
  onDelete?: () => void;
}

export default function ClassModal({ existing, onClose, onSave, onDelete }: Props) {
  const [name, setName] = useState(existing?.name ?? "");
  const [color, setColor] = useState(existing?.color ?? CLASS_COLORS[0].value);
  const [term, setTerm] = useState(existing?.term ?? "");

  const canSave = name.trim().length > 0;

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <h2>{existing ? "Edit class" : "Add a class"}</h2>

        <div className="field">
          <label>Class name</label>
          <input
            type="text"
            autoFocus
            placeholder="e.g. Organic Chemistry II"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Term (optional)</label>
          <input
            type="text"
            placeholder="e.g. Fall 2026"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Color</label>
          <div className="color-swatches">
            {CLASS_COLORS.map((c) => (
              <button
                key={c.value}
                className={`swatch ${color === c.value ? "selected" : ""}`}
                style={{ background: c.value }}
                title={c.name}
                onClick={() => setColor(c.value)}
              />
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <div>
            {existing && onDelete && (
              <button className="text-btn danger" onClick={onDelete}>
                Delete class
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
              onClick={() => canSave && onSave(name.trim(), color, term.trim() || null)}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
