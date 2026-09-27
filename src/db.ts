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
}

export async function createAssignment(input: AssignmentInput): Promise<void> {
  const db = await getDb();
  const ts = nowIso();
  await db.execute(
    `INSERT INTO assignments
      (class_id, title, due_date, status, details, progress_notes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [input.class_id, input.title, input.due_date, input.status, input.details, input.progress_notes, ts, ts]
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
