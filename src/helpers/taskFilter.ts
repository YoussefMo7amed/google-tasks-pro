/**
 * Task Filter Helpers
 * 
 * Centralized filtering logic for tasks across Board, List, and Eisenhower views.
 */

import { AppTask } from "../types/app";
import { TaskFilterState } from "../store";

export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDueDate(dueStr?: string | null): string | null {
  if (!dueStr) return null;
  return dueStr.substring(0, 10);
}

export function getWeekBounds(isRtl: boolean, refDate: Date = new Date()): { startStr: string; endStr: string } {
  const d = new Date(refDate);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  // In RTL / Arabic: Saturday (6) to Friday (5)
  // In LTR: Sunday (0) to Saturday (6)
  const diffToStart = isRtl ? (day === 6 ? 0 : day + 1) : day;
  const start = new Date(d);
  start.setDate(d.getDate() - diffToStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    startStr: formatDateKey(start),
    endStr: formatDateKey(end),
  };
}

export function matchesTaskFilter(
  task: AppTask,
  filter: TaskFilterState,
  isRtl: boolean,
  todayStr: string = formatDateKey(new Date())
): boolean {
  const taskDue = parseDueDate(task.due);
  const isCompleted = task.status === "completed";
  const isOverdue = !isCompleted && !!taskDue && taskDue < todayStr;

  // 1. Status Filter
  if (filter.status === "pending" && isCompleted) return false;
  if (filter.status === "completed" && !isCompleted) return false;
  if (filter.status === "overdue" && !isOverdue) return false;

  // 2. Date Filter
  if (filter.date === "today") {
    if (!taskDue || taskDue !== todayStr) return false;
  } else if (filter.date === "thisWeek") {
    const bounds = getWeekBounds(isRtl);
    if (!taskDue || taskDue < bounds.startStr || taskDue > bounds.endStr) return false;
  } else if (filter.date === "thisMonth") {
    const currentMonth = todayStr.substring(0, 7);
    if (!taskDue || taskDue.substring(0, 7) !== currentMonth) return false;
  }

  // 3. Search Filter
  if (filter.search.trim()) {
    const query = filter.search.toLowerCase();
    const matchesTitle = task.title.toLowerCase().includes(query);
    const matchesNotes = task.notes?.toLowerCase().includes(query);
    if (!matchesTitle && !matchesNotes) return false;
  }

  return true;
}
