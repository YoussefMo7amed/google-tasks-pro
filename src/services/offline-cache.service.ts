/**
 * Offline Cache Service
 * 
 * Caches full snapshots of task lists and tasks in local storage.
 * Ensures the app loads instantaneously on startup and functions without network.
 */

import { AppTaskList } from "../types/app";

const CACHE_KEY = "google_tasks_offline_snapshot_v1";
const TIMESTAMP_KEY = "google_tasks_offline_snapshot_timestamp";

class OfflineCacheService {
  /**
   * Save task lists snapshot to localStorage
   */
  public saveSnapshot(taskLists: AppTaskList[]): void {
    try {
      if (!taskLists || taskLists.length === 0) return;
      localStorage.setItem(CACHE_KEY, JSON.stringify(taskLists));
      localStorage.setItem(TIMESTAMP_KEY, new Date().toISOString());
    } catch (e) {
      console.warn("Failed to save offline snapshot to localStorage:", e);
    }
  }

  /**
   * Load task lists snapshot from localStorage
   */
  public loadSnapshot(): AppTaskList[] | null {
    try {
      const data = localStorage.getItem(CACHE_KEY);
      if (!data) return null;
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return null;
    } catch (e) {
      console.warn("Failed to load offline snapshot from localStorage:", e);
      return null;
    }
  }

  /**
   * Get timestamp of last cached snapshot
   */
  public getLastUpdated(): Date | null {
    try {
      const ts = localStorage.getItem(TIMESTAMP_KEY);
      return ts ? new Date(ts) : null;
    } catch {
      return null;
    }
  }

  /**
   * Clear cache
   */
  public clear(): void {
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.removeItem(TIMESTAMP_KEY);
    } catch (e) {
      console.warn("Failed to clear offline cache:", e);
    }
  }
}

export const offlineCacheService = new OfflineCacheService();
