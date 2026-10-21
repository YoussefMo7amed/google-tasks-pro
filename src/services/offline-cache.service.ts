/**
 * Offline Cache Service
 * 
 * Caches full snapshots of task lists and tasks in local storage.
 * Ensures the app loads instantaneously on startup and functions without network.
 * Scoped by active user/guest to prevent cross-account task mixing.
 */

import { AppTaskList } from "../types/app";
import { getActiveStorageScope } from "../helpers/storage-scope";

const LEGACY_CACHE_KEY = "google_tasks_offline_snapshot_v1";
const LEGACY_TIMESTAMP_KEY = "google_tasks_offline_snapshot_timestamp";

class OfflineCacheService {
  private getCacheKey(scope?: string): string {
    const s = scope || getActiveStorageScope();
    return `google_tasks_offline_snapshot_${s}`;
  }

  private getTimestampKey(scope?: string): string {
    const s = scope || getActiveStorageScope();
    return `google_tasks_offline_snapshot_timestamp_${s}`;
  }

  /**
   * Save task lists snapshot to localStorage
   */
  public saveSnapshot(taskLists: AppTaskList[], scope?: string): void {
    try {
      if (!taskLists) return;
      const key = this.getCacheKey(scope);
      const tsKey = this.getTimestampKey(scope);
      localStorage.setItem(key, JSON.stringify(taskLists));
      localStorage.setItem(tsKey, new Date().toISOString());
    } catch (e) {
      console.warn("Failed to save offline snapshot to localStorage:", e);
    }
  }

  /**
   * Load task lists snapshot from localStorage
   */
  public loadSnapshot(scope?: string): AppTaskList[] | null {
    try {
      const activeScope = scope || getActiveStorageScope();
      const key = this.getCacheKey(activeScope);
      let data = localStorage.getItem(key);

      // Migration: if signed in and no scoped cache yet, migrate from legacy global cache
      if (!data && activeScope !== "guest") {
        const legacyData = localStorage.getItem(LEGACY_CACHE_KEY);
        if (legacyData) {
          localStorage.setItem(key, legacyData);
          localStorage.removeItem(LEGACY_CACHE_KEY);
          data = legacyData;
        }
      }

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
  public getLastUpdated(scope?: string): Date | null {
    try {
      const tsKey = this.getTimestampKey(scope);
      const ts = localStorage.getItem(tsKey);
      return ts ? new Date(ts) : null;
    } catch {
      return null;
    }
  }

  /**
   * Clear cache for a specific scope or active scope
   */
  public clear(scope?: string): void {
    try {
      const key = this.getCacheKey(scope);
      const tsKey = this.getTimestampKey(scope);
      localStorage.removeItem(key);
      localStorage.removeItem(tsKey);
      localStorage.removeItem(LEGACY_CACHE_KEY);
      localStorage.removeItem(LEGACY_TIMESTAMP_KEY);
    } catch (e) {
      console.warn("Failed to clear offline cache:", e);
    }
  }
}

export const offlineCacheService = new OfflineCacheService();
