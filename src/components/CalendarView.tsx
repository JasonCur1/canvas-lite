import { useState } from "react";
import {
  MONTH_NAMES,
  WEEKDAY_LABELS,
  buildMonthGrid,
  formatFriendly,
  todayStr,
} from "../dateUtils";
import type { AssignmentRow, ClassRow } from "../types";

interface Props {
  assignments: AssignmentRow[];
  classes: ClassRow[];
  onToggleDone: (a: AssignmentRow) => void;
  onOpen: (a: AssignmentRow) => void;
  onAddOnDate: (dateStr: string) => void;
}

const MAX_CHIPS_PER_CELL = 3;

export default function CalendarView({ assignments, classes, onToggleDone, onOpen, onAddOnDate }: Props) {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const classById = new Map(classes.map((c) => [c.id, c]));
  const byDate = new Map<string, AssignmentRow[]>();
  for (const a of assignments) {
    if (!a.due_date) continue;
    if (!byDate.has(a.due_date)) byDate.set(a.due_date, []);
    byDate.get(a.due_date)!.push(a);
  }

  const grid = buildMonthGrid(cursor.year, cursor.month);

  function shiftMonth(delta: number) {
    let m = cursor.month + delta;
    let y = cursor.year;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setCursor({ year: y, month: m });
  }

  const selectedAssignments = selectedDate ? byDate.get(selectedDate) ?? [] : [];

  return (
    <div>
      <div className="calendar-header">
        <button className="nav-btn" onClick={() => shiftMonth(-1)}>
          ‹
        </button>
        <h2>
          {MONTH_NAMES[cursor.month]} {cursor.year}
        </h2>
        <button className="nav-btn" onClick={() => shiftMonth(1)}>
          ›
        </button>
        <button
          className="today-btn"
          onClick={() => {
            setCursor({ year: today.getFullYear(), month: today.getMonth() });
            setSelectedDate(todayStr());
          }}
        >
          Today
        </button>
      </div>

      <div className="weekday-row">
        {WEEKDAY_LABELS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="month-grid">
        {grid.map((cell) => {
          const items = byDate.get(cell.dateStr) ?? [];
          const shown = items.slice(0, MAX_CHIPS_PER_CELL);
          const extra = items.length - shown.length;
          return (
            <div
              key={cell.dateStr}
              className={`day-cell ${cell.inCurrentMonth ? "" : "dim"} ${
                selectedDate === cell.dateStr ? "selected" : ""
              }`}
              onClick={() => setSelectedDate(cell.dateStr)}
              onDoubleClick={() => onAddOnDate(cell.dateStr)}
            >
              <span className={`day-number ${cell.isToday ? "is-today" : ""}`}>
                {cell.date.getDate()}
              </span>
              {shown.map((a) => {
                const cls = classById.get(a.class_id);
                return (
                  <span
                    key={a.id}
                    className={`day-chip ${a.status === "done" ? "done" : ""}`}
                    style={{ background: cls?.color ?? "#8a8f99" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpen(a);
                    }}
                  >
                    {a.title}
                  </span>
                );
              })}
              {extra > 0 && <span className="day-more">+{extra} more</span>}
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="day-panel">
          <h3>{formatFriendly(selectedDate)}</h3>
          {selectedAssignments.length === 0 ? (
            <p style={{ color: "var(--ink-soft)", fontSize: 13.5 }}>
              Nothing due this day.{" "}
              <button className="text-btn" style={{ padding: 0 }} onClick={() => onAddOnDate(selectedDate)}>
                Add an assignment
              </button>
            </p>
          ) : (
            selectedAssignments.map((a) => {
              const cls = classById.get(a.class_id);
              const done = a.status === "done";
              return (
                <div className="assignment-row" key={a.id} onClick={() => onOpen(a)}>
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
                    {a.progress_notes && (
                      <div className="assignment-note-preview">{a.progress_notes}</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
