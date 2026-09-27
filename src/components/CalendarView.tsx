import { useState } from "react";
import {
  MONTH_NAMES,
  WEEKDAY_LABELS,
  buildMonthGrid,
  buildWeekGrid,
  formatFriendly,
  formatWeekRange,
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
type CalMode = "month" | "week";

export default function CalendarView({ assignments, classes, onToggleDone, onOpen, onAddOnDate }: Props) {
  const today = new Date();
  const [mode, setMode] = useState<CalMode>("month");
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [weekAnchor, setWeekAnchor] = useState(today);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const classById = new Map(classes.map((c) => [c.id, c]));
  const byDate = new Map<string, AssignmentRow[]>();
  for (const a of assignments) {
    if (!a.due_date) continue;
    if (!byDate.has(a.due_date)) byDate.set(a.due_date, []);
    byDate.get(a.due_date)!.push(a);
  }

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

  function shiftWeek(delta: number) {
    setWeekAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + delta * 7));
  }

  function goToday() {
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
    setWeekAnchor(today);
    setSelectedDate(todayStr());
  }

  const monthGrid = mode === "month" ? buildMonthGrid(cursor.year, cursor.month) : [];
  const weekGrid = mode === "week" ? buildWeekGrid(weekAnchor) : [];

  const selectedAssignments = selectedDate ? byDate.get(selectedDate) ?? [] : [];

  return (
    <div>
      <div className="calendar-header">
        <div className="calendar-mode-toggle">
          <button className={mode === "month" ? "active" : ""} onClick={() => setMode("month")}>
            Month
          </button>
          <button className={mode === "week" ? "active" : ""} onClick={() => setMode("week")}>
            Week
          </button>
        </div>

        <button className="nav-btn" onClick={() => (mode === "month" ? shiftMonth(-1) : shiftWeek(-1))}>
          ‹
        </button>
        <h2>{mode === "month" ? `${MONTH_NAMES[cursor.month]} ${cursor.year}` : formatWeekRange(weekGrid)}</h2>
        <button className="nav-btn" onClick={() => (mode === "month" ? shiftMonth(1) : shiftWeek(1))}>
          ›
        </button>
        <button className="today-btn" onClick={goToday}>
          Today
        </button>
      </div>

      {mode === "month" ? (
        <>
          <div className="weekday-row">
            {WEEKDAY_LABELS.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>
          <div className="month-grid">
            {monthGrid.map((cell) => {
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
        </>
      ) : (
        <div className="week-grid">
          {weekGrid.map((cell) => {
            const items = byDate.get(cell.dateStr) ?? [];
            return (
              <div key={cell.dateStr} className="week-day-column">
                <div
                  className={`week-day-header ${cell.isToday ? "is-today" : ""}`}
                  onClick={() => onAddOnDate(cell.dateStr)}
                  title="Add an assignment due this day"
                >
                  <span className="week-day-name">{WEEKDAY_LABELS[cell.date.getDay()]}</span>
                  <span className="week-day-number">{cell.date.getDate()}</span>
                </div>
                <div className="week-day-body">
                  {items.length === 0 ? (
                    <button className="week-add-btn" onClick={() => onAddOnDate(cell.dateStr)}>
                      + Add
                    </button>
                  ) : (
                    items.map((a) => {
                      const cls = classById.get(a.class_id);
                      const done = a.status === "done";
                      return (
                        <div
                          key={a.id}
                          className={`week-item ${done ? "done" : ""}`}
                          onClick={() => onOpen(a)}
                        >
                          <button
                            className={`checkbox ${done ? "checked" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleDone(a);
                            }}
                          >
                            {done ? "✓" : ""}
                          </button>
                          <div className="week-item-text">
                            {cls && (
                              <span className="class-tag" style={{ background: cls.color }}>
                                {cls.name}
                              </span>
                            )}
                            <div className={`week-item-title ${done ? "done" : ""}`}>{a.title}</div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {mode === "month" && selectedDate && (
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
