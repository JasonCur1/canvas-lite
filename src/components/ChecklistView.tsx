import { BUCKET_LABEL, BUCKET_ORDER, bucketFor, formatFriendly } from "../dateUtils";
import type { AssignmentRow, ClassRow } from "../types";

interface Props {
  assignments: AssignmentRow[];
  classes: ClassRow[];
  onToggleDone: (a: AssignmentRow) => void;
  onOpen: (a: AssignmentRow) => void;
}

export default function ChecklistView({ assignments, classes, onToggleDone, onOpen }: Props) {
  const classById = new Map(classes.map((c) => [c.id, c]));

  const open = assignments.filter((a) => a.status !== "done");
  const done = assignments.filter((a) => a.status === "done");

  const grouped = new Map<string, AssignmentRow[]>();
  for (const a of open) {
    const b = bucketFor(a.due_date);
    if (!grouped.has(b)) grouped.set(b, []);
    grouped.get(b)!.push(a);
  }

  if (assignments.length === 0) {
    return (
      <div className="empty-state">
        <h3>No assignments yet</h3>
        <p>Add a class, then add assignments to start tracking due dates.</p>
      </div>
    );
  }

  return (
    <div>
      {BUCKET_ORDER.map((bucket) => {
        const rows = grouped.get(bucket);
        if (!rows || rows.length === 0) return null;
        return (
          <div className="bucket" key={bucket}>
            <div className={`bucket-title ${bucket === "overdue" ? "overdue" : ""}`}>
              {BUCKET_LABEL[bucket]}
              <span className="bucket-count">{rows.length}</span>
            </div>
            {rows.map((a) => {
              const cls = classById.get(a.class_id);
              return (
                <AssignmentRowItem
                  key={a.id}
                  a={a}
                  cls={cls}
                  overdue={bucket === "overdue"}
                  onToggleDone={onToggleDone}
                  onOpen={onOpen}
                />
              );
            })}
          </div>
        );
      })}

      {done.length > 0 && (
        <div className="bucket">
          <div className="bucket-title">
            Done
            <span className="bucket-count">{done.length}</span>
          </div>
          {done.map((a) => (
            <AssignmentRowItem
              key={a.id}
              a={a}
              cls={classById.get(a.class_id)}
              overdue={false}
              onToggleDone={onToggleDone}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AssignmentRowItem({
  a,
  cls,
  overdue,
  onToggleDone,
  onOpen,
}: {
  a: AssignmentRow;
  cls: ClassRow | undefined;
  overdue: boolean;
  onToggleDone: (a: AssignmentRow) => void;
  onOpen: (a: AssignmentRow) => void;
}) {
  const done = a.status === "done";
  return (
    <div className="assignment-row" onClick={() => onOpen(a)}>
      <button
        className={`checkbox ${done ? "checked" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleDone(a);
        }}
      >
        {done ? "✓" : ""}
      </button>
      <div className="assignment-main">
        <div className="assignment-title-row">
          {cls && (
            <span className="class-tag" style={{ background: cls.color }}>
              {cls.name}
            </span>
          )}
          <span className={`assignment-title ${done ? "done" : ""}`}>{a.title}</span>
        </div>
        <div className={`assignment-meta ${overdue ? "overdue" : ""}`}>
          {formatFriendly(a.due_date)}
          {a.status === "in_progress" && !done ? " · In progress" : ""}
          {a.missing_from_feed && !done ? " · No longer in D2L feed" : ""}
        </div>
        {a.progress_notes && <div className="assignment-note-preview">{a.progress_notes}</div>}
      </div>
    </div>
  );
}
