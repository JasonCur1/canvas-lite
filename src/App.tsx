import { useEffect, useState } from "react";
import * as db from "./db";
import Sidebar from "./components/Sidebar";
import CalendarView from "./components/CalendarView";
import ChecklistView from "./components/ChecklistView";
import ClassModal from "./components/ClassModal";
import AssignmentModal from "./components/AssignmentModal";
import ImportModal from "./components/ImportModal";
import SyncModal from "./components/SyncModal";
import { FEED_URL_KEY, syncFeed } from "./syncCalendar";
import type { AssignmentRow, ClassRow } from "./types";

type View = "calendar" | "checklist";

export default function App() {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("checklist");
  const [selectedClassId, setSelectedClassId] = useState<number | "all">("all");

  const [classModal, setClassModal] = useState<{ open: boolean; existing: ClassRow | null }>({
    open: false,
    existing: null,
  });
  const [assignmentModal, setAssignmentModal] = useState<{
    open: boolean;
    existing: AssignmentRow | null;
    defaultDueDate?: string;
  }>({ open: false, existing: null });
  const [importOpen, setImportOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");

  async function refresh() {
    const [c, a] = await Promise.all([db.listClasses(), db.listAssignments()]);
    setClasses(c);
    setAssignments(a);
  }

  useEffect(() => {
    refresh()
      .finally(() => setLoading(false))
      .then(autoSync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If a D2L calendar link is saved, quietly sync it when the app opens.
  async function autoSync() {
    try {
      const url = await db.getSetting(FEED_URL_KEY);
      if (!url) return;
      setSyncStatus("Syncing…");
      const outcome = await syncFeed(url);
      if (outcome.kind === "needs_mapping") {
        setSyncStatus("New D2L courses need matching — open sync");
        return;
      }
      setSyncStatus(`Synced ${new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`);
      await refresh();
    } catch {
      setSyncStatus("Couldn't sync D2L (offline?)");
    }
  }

  const visibleAssignments =
    selectedClassId === "all" ? assignments : assignments.filter((a) => a.class_id === selectedClassId);

  async function handleToggleDone(a: AssignmentRow) {
    await db.setAssignmentStatus(a.id, a.status === "done" ? "not_started" : "done");
    refresh();
  }

  async function handleSaveClass(name: string, color: string, term: string | null) {
    if (classModal.existing) {
      await db.updateClass(classModal.existing.id, name, color, term);
    } else {
      await db.createClass(name, color, term);
    }
    setClassModal({ open: false, existing: null });
    refresh();
  }

  async function handleDeleteClass() {
    if (!classModal.existing) return;
    await db.deleteClass(classModal.existing.id);
    setClassModal({ open: false, existing: null });
    if (selectedClassId === classModal.existing.id) setSelectedClassId("all");
    refresh();
  }

  async function handleSaveAssignment(input: db.AssignmentInput) {
    if (assignmentModal.existing) {
      await db.updateAssignment(assignmentModal.existing.id, input);
    } else {
      await db.createAssignment(input);
    }
    setAssignmentModal({ open: false, existing: null });
    refresh();
  }

  async function handleDeleteAssignment() {
    if (!assignmentModal.existing) return;
    await db.deleteAssignment(assignmentModal.existing.id);
    setAssignmentModal({ open: false, existing: null });
    refresh();
  }

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", color: "var(--ink-soft)" }}>
        Loading…
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        classes={classes}
        assignments={assignments}
        selectedClassId={selectedClassId}
        onSelectClass={setSelectedClassId}
        onAddClass={() => setClassModal({ open: true, existing: null })}
        onEditClass={(c) => setClassModal({ open: true, existing: c })}
        onImport={() => setImportOpen(true)}
        onOpenSync={() => setSyncOpen(true)}
        syncStatus={syncStatus}
      />

      <div className="main">
        <div className="topbar">
          <div className="view-toggle">
            <button className={view === "checklist" ? "active" : ""} onClick={() => setView("checklist")}>
              Checklist
            </button>
            <button className={view === "calendar" ? "active" : ""} onClick={() => setView("calendar")}>
              Calendar
            </button>
          </div>
          <button
            className="primary-btn"
            onClick={() =>
              setAssignmentModal({
                open: true,
                existing: null,
              })
            }
          >
            + Add assignment
          </button>
        </div>

        <div className="content">
          {view === "checklist" ? (
            <ChecklistView
              assignments={visibleAssignments}
              classes={classes}
              onToggleDone={handleToggleDone}
              onOpen={(a) => setAssignmentModal({ open: true, existing: a })}
            />
          ) : (
            <CalendarView
              assignments={visibleAssignments}
              classes={classes}
              onToggleDone={handleToggleDone}
              onOpen={(a) => setAssignmentModal({ open: true, existing: a })}
              onAddOnDate={(dateStr) =>
                setAssignmentModal({ open: true, existing: null, defaultDueDate: dateStr })
              }
            />
          )}
        </div>
      </div>

      {classModal.open && (
        <ClassModal
          existing={classModal.existing}
          onClose={() => setClassModal({ open: false, existing: null })}
          onSave={handleSaveClass}
          onDelete={classModal.existing ? handleDeleteClass : undefined}
        />
      )}

      {assignmentModal.open && (
        <AssignmentModal
          classes={classes}
          existing={assignmentModal.existing}
          defaultClassId={selectedClassId !== "all" ? selectedClassId : undefined}
          defaultDueDate={assignmentModal.defaultDueDate}
          onClose={() => setAssignmentModal({ open: false, existing: null })}
          onSave={handleSaveAssignment}
          onDelete={assignmentModal.existing ? handleDeleteAssignment : undefined}
        />
      )}

      {syncOpen && (
        <SyncModal
          classes={classes}
          onClose={() => setSyncOpen(false)}
          onChanged={refresh}
          onOpenFileImport={() => setImportOpen(true)}
          onStatus={setSyncStatus}
        />
      )}

      {importOpen && (
        <ImportModal
          classes={classes}
          assignments={assignments}
          onClose={() => setImportOpen(false)}
          onImported={refresh}
        />
      )}
    </div>
  );
}
