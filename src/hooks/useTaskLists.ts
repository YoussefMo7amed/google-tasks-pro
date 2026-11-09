/**
 * Task Lists Hook
 * 
 * Provides task lists data and operations to components.
 */

import { useCallback, useRef } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { 
  taskListsAtom, 
  taskListsLoadingAtom, 
  taskListsErrorAtom,
  toastAtom,
  starredTaskIdsAtom,
  isOnlineAtom,
  accessTokenAtom,
} from "../store";
import { scheduleAllTaskNotifications } from "../services/notification.service";
import { offlineCacheService } from "../services/offline-cache.service";
import { syncQueueService } from "../services/sync-queue.service";
import { historyService } from "../services/history.service";
import { useServices } from "./useServices";
import { AppTaskList, AppTask } from "../types/app";
import { useTranslation } from "../i18n";

/**
 * Defensive sanitizer: cleans up orphan subtasks whose parents do not exist in the list
 */
function sanitizeSubtasks(lists: AppTaskList[]): AppTaskList[] {
  return lists.map((list) => {
    const listTaskIds = new Set((list.tasks || []).map((t) => t.id));
    let modified = false;
    const sanitizedTasks = (list.tasks || []).map((task) => {
      if (task.parent && !listTaskIds.has(task.parent)) {
        modified = true;
        const { parent, ...rest } = task;
        return rest as AppTask;
      }
      return task;
    });
    return modified ? { ...list, tasks: sanitizedTasks } : list;
  });
}

export function useTaskLists() {
  const { t } = useTranslation();
  const { taskLists: service, tasks: taskService, starred } = useServices();
  const [taskLists, setTaskLists] = useRecoilState(taskListsAtom);
  const [loading, setLoading] = useRecoilState(taskListsLoadingAtom);
  const [error, setError] = useRecoilState(taskListsErrorAtom);
  const setIsOnline = useSetRecoilState(isOnlineAtom);
  const setToast = useSetRecoilState(toastAtom);
  const setStarredIds = useSetRecoilState(starredTaskIdsAtom);
  const currentToken = useRecoilValue(accessTokenAtom);

  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef<number>(0);
  const taskListsRef = useRef(taskLists);
  taskListsRef.current = taskLists;

  // Reset rate limiting and in-flight fetch guard on account/token switch
  const prevTokenRef = useRef(currentToken);
  if (prevTokenRef.current !== currentToken) {
    prevTokenRef.current = currentToken;
    lastFetchTimeRef.current = 0;
    isFetchingRef.current = false;
  }

  /**
   * Fetch all task lists with offline-first caching
   */
  const fetchTaskLists = useCallback(async (forceRefresh = false) => {
    // Guest / Offline Mode: isolated strictly to "guest" scope
    if (!service) {
      const guestCached = offlineCacheService.loadSnapshot("guest");
      if (guestCached && guestCached.length > 0) {
        setTaskLists(guestCached);
        historyService.syncFromTaskLists(guestCached);
      } else {
        const defaultList: AppTaskList = {
          kind: "tasks#taskList",
          id: `local_list_${Date.now()}`,
          etag: "",
          selfLink: "",
          title: t("tasks.defaultListName"),
          updated: new Date().toISOString(),
          tasks: [],
          incompleteCount: 0,
          isVisible: true,
        };
        setTaskLists([defaultList]);
        offlineCacheService.saveSnapshot([defaultList], "guest");
      }
      setLoading(false);
      return;
    }

    // 1. Immediately load from offline cache if state is empty
    const cached = offlineCacheService.loadSnapshot();
    if (cached && taskListsRef.current.length === 0) {
      const cleanCached = sanitizeSubtasks(cached);
      setTaskLists(cleanCached);
      historyService.syncFromTaskLists(cleanCached);
      setLoading(false);
    }

    // Skip redundant network fetch if already loaded and fetched recently (<30s), unless forced
    const now = Date.now();
    if (!forceRefresh && taskListsRef.current.length > 0 && now - lastFetchTimeRef.current < 30_000) {
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
              title: t("sync.syncedWithGoogle"),
              body: t("sync.syncedOfflineChanges", { count: syncedCount }),
              type: "success",
            });
          }
        } catch (queueErr) {
          console.warn("Error draining sync queue:", queueErr);
        }
      }

      // 3. Fetch fresh data from Google Tasks API
      const lists = await service.getAll(forceRefresh);
      const cleanLists = sanitizeSubtasks(lists);
      setTaskLists(cleanLists);
      historyService.syncFromTaskLists(cleanLists);
      lastFetchTimeRef.current = Date.now();
      setIsOnline(true);
      setError(null);

      // Save fresh snapshot to cache
      offlineCacheService.saveSnapshot(cleanLists);

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
            title: t("sync.offlineMode"),
            body: t("sync.workingOffline"),
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
        setError(t("auth.sessionExpiredDescription"));
        setToast({
          title: t("auth.sessionExpiredTitle"),
          body: t("auth.sessionExpiredDescription"),
          type: "warning",
        });
        return;
      }

      const message = err instanceof Error ? err.message : t("tasks.failedToLoadLists");
      setError(message);
      setToast({ title: t("common.error"), body: message, type: "error" });
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [service, taskService, starred, setTaskLists, setLoading, setError, setToast, setStarredIds, setIsOnline, t]);

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
      setToast({ title: t("tasks.listCreatedOfflineToast"), type: "info" });
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
      setToast({ title: t("tasks.listCreatedToast"), type: "success" });
      return newList;
    } catch (err) {
      console.warn("Failed to create list online, saving offline:", err);
      return createLocallyOffline();
    }
  }, [service, setTaskLists, setToast, t]);

  /**
   * Rename a task list
   */
  const renameTaskList = useCallback(async (id: string, newTitle: string): Promise<boolean> => {
    if (!service) {
      setTaskLists(prev => {
        const next = prev.map(list => list.id === id ? { ...list, title: newTitle } : list);
        offlineCacheService.saveSnapshot(next);
        return next;
      });
      setToast({ title: t("tasks.listRenamedToast"), type: "success" });
      return true;
    }

    try {
      const updated = await service.rename(id, newTitle);
      setTaskLists(prev => prev.map(list => list.id === id ? updated : list));
      setToast({ title: t("tasks.listRenamedToast"), type: "success" });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : t("tasks.failedToRenameList");
      setToast({ title: t("common.error"), body: message, type: "error" });
      return false;
    }
  }, [service, setTaskLists, setToast, t]);

  /**
   * Delete a task list
   */
  const deleteTaskList = useCallback(async (id: string): Promise<boolean> => {
    if (!service) {
      setTaskLists(prev => {
        const next = prev.filter(list => list.id !== id);
        offlineCacheService.saveSnapshot(next);
        return next;
      });
      setToast({ title: t("tasks.listDeletedToast"), type: "warning" });
      return true;
    }

    try {
      await service.delete(id);
      setTaskLists(prev => prev.filter(list => list.id !== id));
      setToast({ title: t("tasks.listDeletedToast"), type: "warning" });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : t("tasks.failedToDeleteList");
      setToast({ title: t("common.error"), body: message, type: "error" });
      return false;
    }
  }, [service, setTaskLists, setToast, t]);

  /**
   * Reorder task lists (local only)
   */
  const reorderTaskLists = useCallback((fromIndex: number, toIndex: number) => {
    if (!service) {
      setTaskLists(prev => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        offlineCacheService.saveSnapshot(next);
        return next;
      });
      return;
    }

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
