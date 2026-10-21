/**
 * Trash / Recycle Bin Service
 * 
 * Manages deleted tasks, auto-clean retention timers, and restoration.
 */

import { AppTask } from "../types/app";
import { getActiveStorageScope } from "../helpers/storage-scope";

export type TrashRetention = "1d" | "3d" | "7d" | "30d" | "never" | "custom";

export interface TrashSettings {
  retention: TrashRetention;
  customDays?: number;
}

export interface TrashedTask {
  id: string; // unique trash item ID
  task: AppTask;
  originalListId: string;
  originalListTitle: string;
  deletedAt: string; // ISO string
  expiresAt: string | null; // ISO string or null for "never"
}

const LEGACY_TRASH_ITEMS_KEY = "google_tasks_trash_items_v1";
const LEGACY_TRASH_SETTINGS_KEY = "google_tasks_trash_settings_v1";

const DEFAULT_SETTINGS: TrashSettings = {
  retention: "7d",
  customDays: 7,
};

export function calculateExpiresAt(deletedAtIso: string, settings: TrashSettings): string | null {
  if (settings.retention === "never") return null;
  let days = 7;
  if (settings.retention === "1d") days = 1;
  else if (settings.retention === "3d") days = 3;
  else if (settings.retention === "7d") days = 7;
  else if (settings.retention === "30d") days = 30;
  else if (settings.retention === "custom") days = Math.max(1, settings.customDays || 1);
  const ms = days * 24 * 60 * 60 * 1000;
  return new Date(new Date(deletedAtIso).getTime() + ms).toISOString();
}

class TrashService {
  private items: TrashedTask[] = [];
  private settings: TrashSettings = DEFAULT_SETTINGS;
  private listeners: Set<(items: TrashedTask[], settings: TrashSettings) => void> = new Set();
  private initialized = false;

  constructor() {
    this.init();
  }

  private getItemsKey(): string {
    return `google_tasks_trash_items_${getActiveStorageScope()}`;
  }

  private getSettingsKey(): string {
    return `google_tasks_trash_settings_${getActiveStorageScope()}`;
  }

  public reloadScope(): void {
    this.initialized = false;
    this.init();
    this.notify();
  }

  private init() {
    if (this.initialized || typeof window === "undefined") return;
    try {
      const scope = getActiveStorageScope();
      const settingsKey = this.getSettingsKey();
      const itemsKey = this.getItemsKey();

      // Migration for logged-in user from legacy key
      if (scope !== "guest") {
        if (!localStorage.getItem(itemsKey) && localStorage.getItem(LEGACY_TRASH_ITEMS_KEY)) {
          localStorage.setItem(itemsKey, localStorage.getItem(LEGACY_TRASH_ITEMS_KEY)!);
          localStorage.removeItem(LEGACY_TRASH_ITEMS_KEY);
        }
        if (!localStorage.getItem(settingsKey) && localStorage.getItem(LEGACY_TRASH_SETTINGS_KEY)) {
          localStorage.setItem(settingsKey, localStorage.getItem(LEGACY_TRASH_SETTINGS_KEY)!);
          localStorage.removeItem(LEGACY_TRASH_SETTINGS_KEY);
        }
      }

      // 1. Load settings
      const rawSettings = localStorage.getItem(settingsKey);
      if (rawSettings) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) };
      } else {
        this.settings = DEFAULT_SETTINGS;
      }

      // 2. Load items
      const rawItems = localStorage.getItem(itemsKey);
      if (rawItems) {
        const parsed: TrashedTask[] = JSON.parse(rawItems);
        this.items = Array.isArray(parsed) ? parsed : [];
      } else {
        this.items = [];
      }

      // 3. Auto-clean expired on initialization
      this.cleanExpiredInternal();
      this.initialized = true;
    } catch (err) {
      console.warn("Failed to initialize TrashService:", err);
      this.items = [];
      this.settings = DEFAULT_SETTINGS;
      this.initialized = true;
    }
  }

  private save() {
    try {
      localStorage.setItem(this.getItemsKey(), JSON.stringify(this.items));
      localStorage.setItem(this.getSettingsKey(), JSON.stringify(this.settings));
    } catch (err) {
      console.warn("Failed to persist trash items/settings:", err);
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener([...this.items], { ...this.settings });
      } catch (err) {
        console.warn("Error in trash listener:", err);
      }
    });
  }

  private cleanExpiredInternal(): number {
    const now = Date.now();
    const originalLength = this.items.length;
    this.items = this.items.filter((item) => {
      if (!item.expiresAt) return true; // never expires
      const expiresTime = new Date(item.expiresAt).getTime();
      return expiresTime > now;
    });
    return originalLength - this.items.length;
  }

  public subscribe(listener: (items: TrashedTask[], settings: TrashSettings) => void): () => void {
    this.listeners.add(listener);
    // Emit initial
    listener([...this.items], { ...this.settings });
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSettings(): TrashSettings {
    this.init();
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<TrashSettings>): TrashSettings {
    this.init();
    this.settings = { ...this.settings, ...partial };
    // Recalculate expiresAt for all existing trashed items
    this.items = this.items.map((item) => ({
      ...item,
      expiresAt: calculateExpiresAt(item.deletedAt, this.settings),
    }));
    this.cleanExpiredInternal();
    this.save();
    return { ...this.settings };
  }

  public getItems(): TrashedTask[] {
    this.init();
    const cleaned = this.cleanExpiredInternal();
    if (cleaned > 0) {
      this.save();
    }
    return [...this.items];
  }

  public moveToTrash(task: AppTask, originalListTitle?: string): TrashedTask {
    this.init();
    const nowIso = new Date().toISOString();
    const trashItem: TrashedTask = {
      id: `trash_${task.id}_${Date.now()}`,
      task: { ...task },
      originalListId: task.listId,
      originalListTitle: originalListTitle || "My Tasks",
      deletedAt: nowIso,
      expiresAt: calculateExpiresAt(nowIso, this.settings),
    };

    // Remove any existing duplicate by task.id
    this.items = [trashItem, ...this.items.filter((i) => i.task.id !== task.id)];
    this.save();
    return trashItem;
  }

  public restoreTask(trashId: string): TrashedTask | null {
    this.init();
    const found = this.items.find((i) => i.id === trashId || i.task.id === trashId);
    if (!found) return null;
    this.items = this.items.filter((i) => i.id !== found.id);
    this.save();
    return found;
  }

  public permanentDelete(trashId: string): boolean {
    this.init();
    const originalLen = this.items.length;
    this.items = this.items.filter((i) => i.id !== trashId && i.task.id !== trashId);
    const removed = this.items.length < originalLen;
    if (removed) {
      this.save();
    }
    return removed;
  }

  public emptyTrash(): void {
    this.init();
    this.items = [];
    this.save();
  }

  public cleanExpired(): number {
    this.init();
    const cleaned = this.cleanExpiredInternal();
    if (cleaned > 0) {
      this.save();
    }
    return cleaned;
  }
}

export const trashService = new TrashService();
