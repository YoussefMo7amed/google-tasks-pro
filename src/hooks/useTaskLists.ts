/**
 * Task Lists Hook
 * 
 * Provides task lists data and operations to components.
 */

import { useCallback, useRef } from "react";
import { useRecoilState, useSetRecoilState } from "recoil";
import { 
  taskListsAtom, 
  taskListsLoadingAtom, 
  taskListsErrorAtom,
  toastAtom,
  starredTaskIdsAtom,
  isOnlineAtom,
} from "../store";
import { scheduleAllTaskNotifications } from "../services/notification.service";
import { offlineCacheService } from "../services/offline-cache.service";
import { syncQueueService } from "../services/sync-queue.service";
import { useServices } from "./useServices";
import { AppTaskList } from "../types/app";

export function useTaskLists() {
  const { taskLists: service, tasks: taskService, starred } = useServices();
  const [taskLists, setTaskLists] = useRecoilState(taskListsAtom);
  const [loading, setLoading] = useRecoilState(taskListsLoadingAtom);
  const [error, setError] = useRecoilState(taskListsErrorAtom);
  const setIsOnline = useSetRecoilState(isOnlineAtom);
  const setToast = useSetRecoilState(toastAtom);
  const setStarredIds = useSetRecoilState(starredTaskIdsAtom);

  const isFetchingRef = useRef(false);
  const taskListsRef = useRef(taskLists);
  taskListsRef.current = taskLists;

  /**
   * Fetch all task lists with offline-first caching
   */
  const fetchTaskLists = useCallback(async (forceRefresh = false) => {
    // 1. Immediately load from offline cache if state is empty
    const cached = offlineCacheService.loadSnapshot();
    if (cached && taskListsRef.current.length === 0) {
      setTaskLists(cached);
      setLoading(false);
    }

    if (!service) {
      setLoading(false);
      return;
    }

    // Prevent concurrent overlapping requests
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    // If offline, don't attempt network call
    if (!navigator.onLine) {
      setIsOnline(false);
      isFetchingRef.current = false;
      setLoading(false);
      if (cached) {
        setTaskLists(cached);
        setError(null);
      }
      return;
    }

    if (taskListsRef.current.length === 0) {
      setLoading(true);
    }
    setError(null);

    try {
      // 2. First, drain any pending offline sync queue
      if (taskService && syncQueueService.getPendingCount() > 0) {
        try {
          const { syncedCount } = await syncQueueService.drainQueue(taskService);
          if (syncedCount > 0) {
            setToast({
              title: "Synced with Google Tasks",
              body: `Synced ${syncedCount} offline change${syncedCount > 1 ? "s" : ""}`,
              type: "success",
            });
          }
        } catch (queueErr) {
          console.warn("Error draining sync queue:", queueErr);
        }
      }

      // 3. Fetch fresh data from Google Tasks API
      const lists = await service.getAll(forceRefresh);
      setTaskLists(lists);
      setIsOnline(true);
      setError(null);

      // Save fresh snapshot to cache
      offlineCacheService.saveSnapshot(lists);

      // Update starred IDs in background and prune any orphaned IDs
      starred.getAll().then((rawStarred) => {
        const allTaskIds = new Set(lists.flatMap((list) => list.tasks.map((t) => t.id)));
        const validStarred = new Set<string>();
        const orphaned: string[] = [];

        rawStarred.forEach((id) => {
          if (allTaskIds.has(id)) {
            validStarred.add(id);
          } else {
            orphaned.push(id);
          }
        });

        if (orphaned.length > 0) {
          Promise.all(orphaned.map((id) => starred.unstar(id))).catch(console.warn);
        }
        setStarredIds(validStarred);
      }).catch(console.warn);

      // Schedule notifications in background without blocking UI
      const allTasks = lists.flatMap(list => list.tasks);
      scheduleAllTaskNotifications(allTasks).catch(console.warn);
    } catch (err) {
      console.error("fetchTaskLists error:", err);
      const isNetErr = !navigator.onLine || (err instanceof Error && err.message.toLowerCase().includes("network"));
      if (isNetErr) {
        setIsOnline(false);
        if (cached || taskListsRef.current.length > 0) {
          setError(null);
          setToast({
            title: "Offline Mode",
            body: "Viewing cached tasks. Changes will sync when online.",
            type: "info",
          });
          return;
        }
      }

      const isAuthErr = err instanceof Error && (err.message.includes("401") || (err as any).statusCode === 401 || err.message.toLowerCase().includes("session expired"));
      if (isAuthErr) {
        if (cached && taskListsRef.current.length === 0) {
          setTaskLists(cached);
        }
        setError("Session expired. Please sign in again.");
        setToast({
          title: "Session Expired",
          body: "Your Google session has expired. Please sign in again to sync tasks.",
          type: "warning",
        });
        return;
      }

      const message = err instanceof Error ? err.message : "Failed to load task lists";
      setError(message);
      setToast({ title: "Error", body: message, type: "error" });
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [service, taskService, starred, setTaskLists, setLoading, setError, setToast, setStarredIds, setIsOnline]);

  /**
   * Create a new task list
   */
  const createTaskList = useCallback(async (title: string): Promise<AppTaskList | null> => {
    const createLocallyOffline = () => {
      const tempId = `temp_list_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const offlineList: AppTaskList = {
        kind: "tasks#taskList",
        id: tempId,
        etag: "",
        selfLink: "",
        title,
        updated: new Date().toISOString(),
        tasks: [],
        incompleteCount: 0,
        isVisible: true,
      };
      setTaskLists(prev => {
        const next = [...prev, offlineList];
        offlineCacheService.saveSnapshot(next);
        return next;
      });
      setToast({ title: "List created (saved offline 💾)", type: "info" });
      return offlineList;
    };

    if (!navigator.onLine || !service) {
      return createLocallyOffline();
    }

    try {
      const newList = await service.create(title);
      setTaskLists(prev => {
        const next = [...prev, newList];
        offlineCacheService.saveSnapshot(next);
        return next;
      });
      setToast({ title: "List created", type: "success" });
      return newList;
    } catch (err) {
      console.warn("Failed to create list online, saving offline:", err);
      return createLocallyOffline();
    }
  }, [service, setTaskLists, setToast]);

  /**
   * Rename a task list
   */
  const renameTaskList = useCallback(async (id: string, newTitle: string): Promise<boolean> => {
    if (!service) return false;

    try {
      const updated = await service.rename(id, newTitle);
      setTaskLists(prev => prev.map(list => list.id === id ? updated : list));
      setToast({ title: "List renamed", type: "success" });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to rename list";
      setToast({ title: "Error", body: message, type: "error" });
      return false;
    }
  }, [service, setTaskLists, setToast]);

  /**
   * Delete a task list
   */
  const deleteTaskList = useCallback(async (id: string): Promise<boolean> => {
    if (!service) return false;

    try {
      await service.delete(id);
      setTaskLists(prev => prev.filter(list => list.id !== id));
      setToast({ title: "List deleted", type: "warning" });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete list";
      setToast({ title: "Error", body: message, type: "error" });
      return false;
    }
  }, [service, setTaskLists, setToast]);

  /**
   * Reorder task lists (local only)
   */
  const reorderTaskLists = useCallback((fromIndex: number, toIndex: number) => {
    if (!service) return;

    const reordered = service.reorderLists(fromIndex, toIndex);
    setTaskLists(reordered);
  }, [service, setTaskLists]);

  /**
   * Toggle list visibility (directly in Recoil state)
   */
  const toggleListVisibility = useCallback((id: string) => {
    setTaskLists(prev => prev.map(list => 
      list.id === id ? { ...list, isVisible: !list.isVisible } : list
    ));
  }, [setTaskLists]);

  return {
    // Data
    taskLists,
    loading,
    error,

    // Actions
    fetchTaskLists,
    createTaskList,
    renameTaskList,
    deleteTaskList,
    reorderTaskLists,
    toggleListVisibility,
  };
}
