/**
 * Task Completion History & Streak Service
 * 
 * Persists completed tasks locally with exact timestamps.
 * Calculates daily streaks, completion counts, and Eisenhower quadrant distributions.
 */

import { AppTask, AppTaskList } from "../types/app";
import { getActiveStorageScope } from "../helpers/storage-scope";

export type QuadrantType = "Q1" | "Q2" | "Q3" | "Q4";

export interface CompletedHistoryItem {
  id: string;
  title: string;
  listId: string;
  listName?: string;
  completedAt: string; // ISO string
  dateKey: string;     // YYYY-MM-DD
  quadrant?: QuadrantType;
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  completedToday: number;
  completedThisWeek: number;
  totalCompleted: number;
}

const STORAGE_KEY = "google_tasks_completed_history";

/**
 * Helper to get local date key YYYY-MM-DD
 */
export function getLocalDateKey(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Extract Eisenhower quadrant from task title
 * Supports [Q1]-[Q4] and Arabic [مربع 1]-[مربع 4] or [ربع 1]-[ربع 4]
 */
export function extractQuadrant(title: string): QuadrantType | undefined {
  if (!title) return undefined;
  if (/\[(?:Q1|مربع\s*1|ربع\s*1)\]/i.test(title)) return "Q1";
  if (/\[(?:Q2|مربع\s*2|ربع\s*2)\]/i.test(title)) return "Q2";
  if (/\[(?:Q3|مربع\s*3|ربع\s*3)\]/i.test(title)) return "Q3";
  if (/\[(?:Q4|مربع\s*4|ربع\s*4)\]/i.test(title)) return "Q4";
  return undefined;
}

/**
 * Strip quadrant tags from title
 */
export function cleanTitleFromQuadrant(title: string): string {
  if (!title) return "";
  return title
    .replace(/\[(?:Q[1-4]|مربع\s*[1-4]|ربع\s*[1-4])\]\s*/gi, "")
    .trim();
}

/**
 * Add or change quadrant tag on title
 */
export function applyQuadrantToTitle(title: string, quadrant: QuadrantType | null): string {
  const clean = cleanTitleFromQuadrant(title);
  if (!quadrant) return clean;
  return `[${quadrant}] ${clean}`;
}

/**
 * History storage management
 */
class HistoryService {
  private history: CompletedHistoryItem[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.load();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error("Error in historyService listener:", err);
      }
    });
  }

  private getStorageKey(): string {
    return `google_tasks_completed_history_${getActiveStorageScope()}`;
  }

  public reloadScope(): void {
    this.load();
    this.notify();
  }

  private load(): void {
    try {
      const scope = getActiveStorageScope();
      const key = this.getStorageKey();

      // Migration for logged-in user from legacy key
      if (scope !== "guest") {
        if (!localStorage.getItem(key) && localStorage.getItem(STORAGE_KEY)) {
          localStorage.setItem(key, localStorage.getItem(STORAGE_KEY)!);
          localStorage.removeItem(STORAGE_KEY);
        }
      }

      const data = localStorage.getItem(key);
      if (data) {
        const parsed: CompletedHistoryItem[] = JSON.parse(data);
        // Automatically purge any leftover demo-generated tasks
        this.history = parsed.filter((item) => !item.id.startsWith("demo-"));
        if (this.history.length !== parsed.length) {
          this.save();
        }
      } else {
        this.history = [];
      }
    } catch (e) {
      console.warn("Failed to load completed history from localStorage:", e);
      this.history = [];
    }
  }

  private save(): void {
    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(this.history));
    } catch (e) {
      console.warn("Failed to save completed history to localStorage:", e);
    }
  }

  /**
   * Clear all history (used to reset analytics or wipe demo data)
   */
  public clearHistory(): void {
    this.history = [];
    this.save();
    this.notify();
  }

  /**
   * Record when a task is completed
   */
  public recordCompletion(task: AppTask, listName?: string): void {
    // Avoid duplicate records if toggled rapidly
    this.history = this.history.filter((h) => h.id !== task.id);

    const now = new Date();
    const item: CompletedHistoryItem = {
      id: task.id,
      title: task.title,
      listId: task.listId,
      listName: listName,
      completedAt: now.toISOString(),
      dateKey: getLocalDateKey(now),
      quadrant: extractQuadrant(task.title),
    };

    this.history.unshift(item);
    // Keep max 2000 historical items
    if (this.history.length > 2000) {
      this.history = this.history.slice(0, 2000);
    }
    this.save();
    this.notify();
  }

  /**
   * Remove from history if marked incomplete again
   */
  public recordUncompletion(taskId: string): void {
    this.history = this.history.filter((h) => h.id !== taskId);
    this.save();
    this.notify();
  }

  /**
   * Sync existing completed tasks from task lists into history
   */
  public syncFromTaskLists(taskLists: AppTaskList[]): void {
    if (!taskLists || taskLists.length === 0) return;

    let changed = false;
    const initialCount = this.history.length;
    this.history = this.history.filter((h) => !h.id.startsWith("demo-"));
    if (this.history.length !== initialCount) {
      changed = true;
    }

    const existingIds = new Set(this.history.map((h) => h.id));

    for (const list of taskLists) {
      if (!list.tasks) continue;
      for (const task of list.tasks) {
        if (task.status === "completed" && !existingIds.has(task.id)) {
          const completedDate = task.completed
            ? new Date(task.completed)
            : task.updated
            ? new Date(task.updated)
            : new Date();

          this.history.push({
            id: task.id,
            title: task.title,
            listId: task.listId || list.id,
            listName: list.title,
            completedAt: completedDate.toISOString(),
            dateKey: getLocalDateKey(completedDate),
            quadrant: extractQuadrant(task.title),
          });
          existingIds.add(task.id);
          changed = true;
        }
      }
    }

    if (changed) {
      this.history.sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
      if (this.history.length > 2000) {
        this.history = this.history.slice(0, 2000);
      }
      this.save();
      this.notify();
    }
  }

  /**
   * Get all completion items
   */
  public getHistory(): CompletedHistoryItem[] {
    return [...this.history];
  }

  /**
   * Calculate streaks and summary stats
   */
  public getStreakStats(): StreakStats {
    const todayKey = getLocalDateKey(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = getLocalDateKey(yesterdayDate);

    // Group dates that have at least 1 completed task
    const activeDates = new Set<string>();
    let completedToday = 0;
    let completedThisWeek = 0;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoKey = getLocalDateKey(sevenDaysAgo);

    for (const item of this.history) {
      activeDates.add(item.dateKey);
      if (item.dateKey === todayKey) {
        completedToday++;
      }
      if (item.dateKey >= sevenDaysAgoKey) {
        completedThisWeek++;
      }
    }

    // Calculate current streak
    let currentStreak = 0;
    const checkDate = new Date();

    // If no tasks completed today, check if yesterday was active
    if (!activeDates.has(todayKey)) {
      if (activeDates.has(yesterdayKey)) {
        // Streak is alive from yesterday
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        currentStreak = 0;
      }
    }

    if (activeDates.has(getLocalDateKey(checkDate))) {
      while (activeDates.has(getLocalDateKey(checkDate))) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    // Calculate longest streak across history
    const sortedDates = Array.from(activeDates).sort();
    let longestStreak = 0;
    let tempStreak = 0;
    let lastDate: Date | null = null;

    for (const dateStr of sortedDates) {
      const currentDate = new Date(dateStr + "T00:00:00");
      if (lastDate) {
        const diffDays = Math.round(
          (currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays === 1) {
          tempStreak++;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      lastDate = currentDate;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    }

    longestStreak = Math.max(longestStreak, currentStreak);

    return {
      currentStreak,
      longestStreak,
      completedToday,
      completedThisWeek,
      totalCompleted: this.history.length,
    };
  }

  /**
   * Get completion activity for the last N days (for charts)
   */
  public getDailyActivity(days = 14): {
    dateKey: string;
    label: string;
    count: number;
    quadrants: Record<QuadrantType | "Other", number>;
  }[] {
    const result = [];
    const countsByDate = new Map<string, { count: number; quadrants: Record<string, number> }>();

    for (const item of this.history) {
      const existing = countsByDate.get(item.dateKey) || {
        count: 0,
        quadrants: { Q1: 0, Q2: 0, Q3: 0, Q4: 0, Other: 0 },
      };
      existing.count++;
      const q = item.quadrant || "Other";
      existing.quadrants[q] = (existing.quadrants[q] || 0) + 1;
      countsByDate.set(item.dateKey, existing);
    }

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = getLocalDateKey(d);
      const data = countsByDate.get(key) || {
        count: 0,
        quadrants: { Q1: 0, Q2: 0, Q3: 0, Q4: 0, Other: 0 },
      };

      const dayLabel = d.toLocaleDateString([], {
        weekday: "narrow",
        month: "numeric",
        day: "numeric",
      });

      result.push({
        dateKey: key,
        label: dayLabel,
        count: data.count,
        quadrants: data.quadrants as Record<QuadrantType | "Other", number>,
      });
    }

    return result;
  }

  /**
   * Quadrant distribution of completed tasks
   */
  public getQuadrantBreakdown(): {
    Q1: number;
    Q2: number;
    Q3: number;
    Q4: number;
    Other: number;
  } {
    const counts = { Q1: 0, Q2: 0, Q3: 0, Q4: 0, Other: 0 };
    for (const item of this.history) {
      const q = item.quadrant || "Other";
      counts[q]++;
    }
    return counts;
  }
}

export const historyService = new HistoryService();
