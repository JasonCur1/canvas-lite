export type Status = "not_started" | "in_progress" | "done";

export interface ClassRow {
  id: number;
  name: string;
  color: string;
  term: string | null;
  created_at: string;
}

export interface AssignmentRow {
  id: number;
  class_id: number;
  title: string;
  due_date: string | null; // ISO date string, e.g. "2026-10-04"
  status: Status;
  details: string | null;
  progress_notes: string | null;
  external_uid: string | null; // id from a synced calendar feed, if any
  missing_from_feed: number; // 1 if a synced item disappeared from the feed
  created_at: string;
  updated_at: string;
}

export const CLASS_COLORS = [
  { name: "Clay", value: "#B2593B" },
  { name: "Moss", value: "#4F6B4B" },
  { name: "Denim", value: "#3B5C82" },
  { name: "Plum", value: "#6B4C6B" },
  { name: "Ochre", value: "#B4862E" },
  { name: "Slate", value: "#4A5560" },
  { name: "Rust", value: "#9C4A3E" },
  { name: "Teal", value: "#3D6B63" },
];

export const STATUS_LABEL: Record<Status, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  done: "Done",
};
