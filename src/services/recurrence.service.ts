/**
 * Recurrence Service
 * 
 * Manages recurring tasks, calculation of next occurrence dates,
 * and automatic spawning of the next task upon completion.
 */

import { AppTask, CreateTaskInput, RecurrenceRule } from "../types/app";

const RECURRENCE_STORAGE_KEY = "google_tasks_recurrence_rules";

class RecurrenceService {
  private rules: Map<string, RecurrenceRule> = new Map();

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const data = localStorage.getItem(RECURRENCE_STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data) as Record<string, RecurrenceRule>;
        this.rules = new Map(Object.entries(parsed));
      }
    } catch (e) {
      console.warn("Failed to load recurrence rules from localStorage:", e);
      this.rules = new Map();
    }
  }

  private save(): void {
    try {
      const obj: Record<string, RecurrenceRule> = {};
      this.rules.forEach((rule, taskId) => {
        obj[taskId] = rule;
      });
      localStorage.setItem(RECURRENCE_STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn("Failed to save recurrence rules to localStorage:", e);
    }
  }

  public getRule(taskId: string): RecurrenceRule | undefined {
    return this.rules.get(taskId);
  }

  public saveRule(taskId: string, rule: RecurrenceRule): void {
    this.rules.set(taskId, rule);
    this.save();
  }

  public removeRule(taskId: string): void {
    this.rules.delete(taskId);
    this.save();
  }

  /**
   * Calculate the next due date based on the recurrence rule
   */
  public calculateNextDueDate(currentDate: Date, rule: RecurrenceRule): Date {
    const next = new Date(currentDate.getTime());
    const interval = Math.max(1, rule.interval || 1);

    if (rule.frequency === "daily") {
      next.setDate(next.getDate() + interval);
    } else if (rule.frequency === "weekly") {
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        // Find next matching day of week
        const sortedDays = [...rule.daysOfWeek].sort((a, b) => a - b);
        const currentDay = currentDate.getDay();
        const nextDayInSameWeek = sortedDays.find((d) => d > currentDay);

        if (nextDayInSameWeek !== undefined) {
          next.setDate(next.getDate() + (nextDayInSameWeek - currentDay));
        } else {
          // Wrap around to first day in subsequent week
          const firstDay = sortedDays[0];
          const daysUntilNextWeek = 7 * interval - (currentDay - firstDay);
          next.setDate(next.getDate() + daysUntilNextWeek);
        }
      } else {
        next.setDate(next.getDate() + 7 * interval);
      }
    } else if (rule.frequency === "monthly") {
      next.setMonth(next.getMonth() + interval);
    } else if (rule.frequency === "yearly") {
      next.setFullYear(next.getFullYear() + interval);
    }

    // Preserve time if specified
    if (rule.time) {
      const [hours, minutes] = rule.time.split(":").map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        next.setHours(hours, minutes, 0, 0);
      }
    }

    return next;
  }

  /**
   * Check if a repeating task should generate another occurrence
   */
  public shouldSpawnNext(rule: RecurrenceRule, nextDueDate: Date): boolean {
    if (rule.endType === "never") {
      return true;
    }
    if (rule.endType === "on_date" && rule.endDate) {
      return nextDueDate <= new Date(rule.endDate);
    }
    if (rule.endType === "after_occurrences" && rule.endCount) {
      const currentCount = rule.occurrenceCount || 1;
      return currentCount < rule.endCount;
    }
    return true;
  }

  /**
   * Handle completion of a task: if recurring, spawns the next occurrence
   */
  public async handleTaskCompletion(
    task: AppTask,
    createTaskFn: (input: CreateTaskInput) => Promise<boolean>
  ): Promise<boolean> {
    const rule = task.recurrence || this.getRule(task.id);
    if (!rule) return false;

    const baseDate = task.due ? new Date(task.due) : new Date();
    const nextDueDate = this.calculateNextDueDate(baseDate, rule);

    if (!this.shouldSpawnNext(rule, nextDueDate)) {
      this.removeRule(task.id);
      return false;
    }

    const updatedRule: RecurrenceRule = {
      ...rule,
      occurrenceCount: (rule.occurrenceCount || 1) + 1,
    };

    const success = await createTaskFn({
      title: task.title,
      notes: task.notes,
      listId: task.listId,
      due: nextDueDate,
      exactTime: task.exactTime || rule.time,
      recurrence: updatedRule,
    });

    return success;
  }
}

export const recurrenceService = new RecurrenceService();
