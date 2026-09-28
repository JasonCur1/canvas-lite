import Database from "@tauri-apps/plugin-sql";
import type { AssignmentRow, ClassRow, Status } from "./types";

let dbPromise: Promise<Database> | null = null;

function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load("sqlite:tracker.db");
  }
  return dbPromise;
}

function nowIso(): string {
  return new Date().toISOString();
}

// ---------- Classes ----------

export async function listClasses(): Promise<ClassRow[]> {
  const db = await getDb();
  return db.select<ClassRow[]>("SELECT * FROM classes ORDER BY name COLLATE NOCASE ASC");
}

export async function createClass(name: string, color: string, term: string | null): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    "INSERT INTO classes (name, color, term, created_at) VALUES ($1, $2, $3, $4)",
    [name, color, term, nowIso()]
  );
  return result.lastInsertId as number;
}

export async function updateClass(
  id: number,
  name: string,
  color: string,
  term: string | null
): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE classes SET name = $1, color = $2, term = $3 WHERE id = $4", [
    name,
    color,
    term,
    id,
  ]);
}

export async function deleteClass(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM classes WHERE id = $1", [id]);
}

// ---------- Assignments ----------

export async function listAssignments(): Promise<AssignmentRow[]> {
  const db = await getDb();
  return db.select<AssignmentRow[]>("SELECT * FROM assignments ORDER BY due_date IS NULL, due_date ASC");
}

export interface AssignmentInput {
  class_id: number;
  title: string;
  due_date: string | null;
  status: Status;
  details: string | null;
  progress_notes: string | null;
  external_uid?: string | null;
}

export async function createAssignment(input: AssignmentInput): Promise<void> {
  const db = await getDb();
  const ts = nowIso();
  await db.execute(
    `INSERT INTO assignments
      (class_id, title, due_date, status, details, progress_notes, external_uid, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      input.class_id,
      input.title,
      input.due_date,
      input.status,
      input.details,
      input.progress_notes,
      input.external_uid ?? null,
      ts,
      ts,
    ]
  );
}

export async function updateAssignment(id: number, input: AssignmentInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE assignments SET
      class_id = $1, title = $2, due_date = $3, status = $4,
      details = $5, progress_notes = $6, updated_at = $7
     WHERE id = $8`,
    [
      input.class_id,
      input.title,
      input.due_date,
      input.status,
      input.details,
      input.progress_notes,
      nowIso(),
      id,
    ]
  );
}

export async function setAssignmentStatus(id: number, status: Status): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE assignments SET status = $1, updated_at = $2 WHERE id = $3", [
    status,
    nowIso(),
    id,
  ]);
}

export async function deleteAssignment(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM assignments WHERE id = $1", [id]);
}

// ---------- Calendar sync helpers ----------

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const rows = await db.select<{ value: string | null }[]>("SELECT value FROM settings WHERE key = $1", [key]);
  return rows.length > 0 ? rows[0].value : null;
}

export async function setSetting(key: string, value: string | null): Promise<void> {
  const db = await getDb();
  if (value === null) {
    await db.execute("DELETE FROM settings WHERE key = $1", [key]);
  } else {
    await db.execute(
      "INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, value]
    );
  }
}

export interface CourseMapping {
  hint: string;
  class_id: number | null; // null = ignore this course
}

export async function listMappings(): Promise<CourseMapping[]> {
  const db = await getDb();
  return db.select<CourseMapping[]>("SELECT hint, class_id FROM course_mappings");
}

export async function saveMapping(hint: string, classId: number | null): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO course_mappings (hint, class_id) VALUES ($1, $2) ON CONFLICT(hint) DO UPDATE SET class_id = excluded.class_id",
    [hint, classId]
  );
}

export async function clearMappings(): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM course_mappings");
}

// Updates only what the feed controls (title, due date) and leaves the
// person's own fields (status, details, progress notes) untouched.
export async function applyFeedFields(id: number, title: string, dueDate: string | null): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE assignments SET title = $1, due_date = $2, missing_from_feed = 0, updated_at = $3 WHERE id = $4",
    [title, dueDate, nowIso(), id]
  );
}

export async function adoptAssignment(id: number, uid: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE assignments SET external_uid = $1, missing_from_feed = 0 WHERE id = $2", [uid, id]);
}

export async function setMissingFromFeed(id: number, missing: boolean): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE assignments SET missing_from_feed = $1 WHERE id = $2", [missing ? 1 : 0, id]);
}
