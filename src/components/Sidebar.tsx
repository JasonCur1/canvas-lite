import type { AssignmentRow, ClassRow } from "../types";

interface Props {
  classes: ClassRow[];
  assignments: AssignmentRow[];
  selectedClassId: number | "all";
  onSelectClass: (id: number | "all") => void;
  onAddClass: () => void;
  onEditClass: (c: ClassRow) => void;
  onImport: () => void;
}

export default function Sidebar({
  classes,
  assignments,
  selectedClassId,
  onSelectClass,
  onAddClass,
  onEditClass,
  onImport,
}: Props) {
  const openCount = (classId: number) =>
    assignments.filter((a) => a.class_id === classId && a.status !== "done").length;

  const totalOpen = assignments.filter((a) => a.status !== "done").length;

  return (
    <aside className="sidebar">
      <div className="brand">
        <h1>Coursework</h1>
        <p>your term, at a glance</p>
      </div>

      <div>
        <div className="sidebar-section-label">Classes</div>
        <div className="class-list">
          <button
            className={`class-item ${selectedClassId === "all" ? "active" : ""}`}
            onClick={() => onSelectClass("all")}
          >
            <span className="color-dot" style={{ background: "#8a8f99" }} />
            All classes
            <span className="count">{totalOpen}</span>
          </button>

          {classes.map((c) => (
            <div className="class-item-row" key={c.id}>
              <button
                className={`class-item ${selectedClassId === c.id ? "active" : ""}`}
                onClick={() => onSelectClass(c.id)}
              >
                <span className="color-dot" style={{ background: c.color }} />
                {c.name}
                <span className="count">{openCount(c.id)}</span>
              </button>
              <button
                className="class-edit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditClass(c);
                }}
                title="Edit class"
                style={{ position: "absolute", right: 4 }}
              >
                ⋯
              </button>
            </div>
          ))}
        </div>
        <button className="add-class-btn" onClick={onAddClass}>
          + Add class
        </button>
      </div>

      <div className="sidebar-spacer" />

      <button className="add-class-btn" onClick={onImport}>
        ⇩ Import from D2L
      </button>
    </aside>
  );
}
