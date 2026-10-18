/**
 * Offline Sync Queue Service
 * 
 * Manages an ordered queue of mutations performed while offline.
 * Replays them sequentially to Google Tasks API once connectivity returns,
 * reconciling temporary client IDs with permanent Google IDs.
 */

import { TaskService } from "./task.service";

export type MutationType =
  | "CREATE_TASK"
  | "UPDATE_TASK"
  | "TOGGLE_COMPLETE"
  | "DELETE_TASK"
  | "MOVE_TASK"
  | "CREATE_SUBTASK";

export interface QueuedMutation {
  id: string;             // Unique ID of the mutation
  type: MutationType;
  listId: string;
  taskId?: string;        // May be a tempId
  payload: any;
  timestamp: number;
  retryCount: number;
}

const QUEUE_STORAGE_KEY = "google_tasks_sync_queue_v1";

class SyncQueueService {
  private queue: QueuedMutation[] = [];
  private isDraining = false;
  private listeners: ((pendingCount: number, isSyncing: boolean) => void)[] = [];
  private idMap = new Map<string, string>(); // tempId -> realGoogleId

  constructor() {
    this.loadQueue();
  }

  private loadQueue(): void {
    try {
      const data = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (data) {
        this.queue = JSON.parse(data);
      }
    } catch (e) {
      console.warn("Failed to load sync queue from localStorage:", e);
      this.queue = [];
    }
  }

  private saveQueue(): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
      this.notifyListeners();
    } catch (e) {
      console.warn("Failed to save sync queue to localStorage:", e);
    }
  }

  public subscribe(listener: (pendingCount: number, isSyncing: boolean) => void): () => void {
    this.listeners.push(listener);
    listener(this.queue.length, this.isDraining);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners(): void {
    const count = this.queue.length;
    const syncing = this.isDraining;
    for (const listener of this.listeners) {
      try {
        listener(count, syncing);
      } catch (err) {
        console.error("Error in sync queue subscriber:", err);
      }
    }
  }

  /**
   * Add a mutation to the offline queue
   */
  public enqueue(
    type: MutationType,
    listId: string,
    payload: any,
    taskId?: string
  ): QueuedMutation {
    const mutation: QueuedMutation = {
      id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      type,
      listId,
      taskId,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(mutation);
    this.saveQueue();
    return mutation;
  }

  /**
   * Get number of pending mutations
   */
  public getPendingCount(): number {
    return this.queue.length;
  }

  /**
   * Get whether queue is currently synchronizing
   */
  public getIsSyncing(): boolean {
    return this.isDraining;
  }

  /**
   * Check if an ID was mapped from a temporary ID
   */
  public resolveId(id: string): string {
    return this.idMap.get(id) || id;
  }

  /**
   * Drain the queue by executing each mutation in order against Google Tasks API
   */
  public async drainQueue(
    taskService: TaskService
  ): Promise<{ syncedCount: number; failedCount: number }> {
    if (this.isDraining || this.queue.length === 0) {
      return { syncedCount: 0, failedCount: 0 };
    }

    this.isDraining = true;
    this.notifyListeners();

    let syncedCount = 0;
    let failedCount = 0;

    try {
      while (this.queue.length > 0) {
        const item = this.queue[0];
        // Resolve any target task ID in case a previous CREATE_TASK replaced its temporary ID
        const resolvedTaskId = item.taskId ? this.resolveId(item.taskId) : undefined;
        const resolvedListId = this.resolveId(item.listId);

        try {
          switch (item.type) {
            case "CREATE_TASK": {
              const { title, notes, due, parentId, tempId } = item.payload;
              const resolvedParent = parentId ? this.resolveId(parentId) : undefined;
              const created = await taskService.createTask({
                title,
                notes,
                due: due ? new Date(due) : undefined,
                listId: resolvedListId,
                parentId: resolvedParent,
              });

              if (tempId && created?.id) {
                this.idMap.set(tempId, created.id);
              }
              break;
            }

            case "UPDATE_TASK": {
              if (resolvedTaskId) {
                const { title, notes, due } = item.payload;
                await taskService.updateTask({
                  listId: resolvedListId,
                  id: resolvedTaskId,
                  title,
                  notes,
                  due: due ? new Date(due) : undefined,
                });
              }
              break;
            }

            case "TOGGLE_COMPLETE": {
              if (resolvedTaskId) {
                await taskService.toggleComplete(resolvedListId, resolvedTaskId);
              }
              break;
            }

            case "DELETE_TASK": {
              if (resolvedTaskId) {
                await taskService.deleteTask(resolvedListId, resolvedTaskId);
              }
              break;
            }

            case "MOVE_TASK": {
              if (resolvedTaskId) {
                const toListId = this.resolveId(item.payload.toListId);
                await taskService.moveToList(resolvedListId, resolvedTaskId, toListId);
              }
              break;
            }

            case "CREATE_SUBTASK": {
              if (resolvedTaskId) {
                const { title, tempId } = item.payload;
                const created = await taskService.createTask({
                  listId: resolvedListId,
                  title,
                  parentId: resolvedTaskId,
                });
                if (tempId && created?.id) {
                  this.idMap.set(tempId, created.id);
                }
              }
              break;
            }
          }

          // Successfully processed: remove from queue
          this.queue.shift();
          this.saveQueue();
          syncedCount++;
        } catch (err) {
          console.warn(`Failed to sync mutation ${item.id} (${item.type}):`, err);
          item.retryCount++;
          // If network is completely unreachable, stop draining now and try later
          if (!navigator.onLine) {
            break;
          }

          // If failed 3+ times due to 404 or invalid ID, discard to avoid permanent blockage
          if (item.retryCount >= 3) {
            console.error(`Discarding stuck mutation ${item.id} after 3 retries.`);
            this.queue.shift();
            this.saveQueue();
            failedCount++;
          } else {
            break;
          }
        }
      }
    } finally {
      this.isDraining = false;
      this.notifyListeners();
    }

    return { syncedCount, failedCount };
  }

  /**
   * Clear all pending mutations
   */
  public clear(): void {
    this.queue = [];
    this.saveQueue();
  }
}

export const syncQueueService = new SyncQueueService();
