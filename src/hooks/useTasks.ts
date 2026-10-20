/**
 * Tasks Hook
 * 
 * Provides task data and operations to components.
 */

import { useCallback } from "react";
import { useRecoilState, useSetRecoilState } from "recoil";
import { taskListsAtom, toastAtom, starredTaskIdsAtom } from "../store";
import { useServices } from "./useServices";
import { AppTask, CreateTaskInput } from "../types/app";
import { GoogleTaskStatus } from "../types/google-tasks";
import { 
  scheduleTaskNotification, 
  cancelTaskNotification 
} from "../services/notification.service";
import { historyService } from "../services/history.service";
import { offlineCacheService } from "../services/offline-cache.service";
import { syncQueueService } from "../services/sync-queue.service";

export function useTasks() {
  const { tasks: service } = useServices();
  const [taskLists, setTaskLists] = useRecoilState(taskListsAtom);
  const [starredIds, setStarredIds] = useRecoilState(starredTaskIdsAtom);
  const setToast = useSetRecoilState(toastAtom);

  /**
   * Helper to update a task in the local state
   */
  const updateTaskInState = useCallback((listId: string, taskId: string, updater: (task: AppTask) => AppTask) => {
    setTaskLists(prev => prev.map(list => {
      if (list.id !== listId) return list;
      
      const updatedTasks = list.tasks.map(task => 
        task.id === taskId ? updater(task) : task
      );
      
      return {
        ...list,
        tasks: updatedTasks,
        incompleteCount: updatedTasks.filter(t => t.status === "needsAction").length,
      };
    }));
  }, [setTaskLists]);

  /**
   * Create a new task (with offline-first queue support)
   */
  const createTask = useCallback(async (input: CreateTaskInput): Promise<AppTask | null> => {
    // Helper to perform local offline creation
    const createLocallyOffline = () => {
      const tempId = `temp_task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const offlineTask: AppTask = {
        kind: "tasks#task",
        id: tempId,
        etag: "",
        selfLink: "",
        position: "0",
        title: input.title,
        notes: input.notes,
        due: input.due ? input.due.toISOString() : undefined,
        status: "needsAction",
        isStarred: false,
        listId: input.listId,
        parent: input.parentId,
        updated: new Date().toISOString(),
      };

      syncQueueService.enqueue(
        "CREATE_TASK",
        input.listId,
        {
          title: input.title,
          notes: input.notes,
          due: input.due ? input.due.toISOString() : undefined,
          parentId: input.parentId,
          tempId,
        },
        tempId
      );

      setTaskLists(prev => {
        const next = prev.map(list => {
          if (list.id !== input.listId) return list;
          return {
            ...list,
            tasks: [offlineTask, ...list.tasks],
            incompleteCount: list.incompleteCount + 1,
          };
        });
        offlineCacheService.saveSnapshot(next);
        return next;
      });

      setToast({ title: "Task added (saved offline 💾)", type: "info" });
      return offlineTask;
    };

    if (!navigator.onLine || !service) {
      return createLocallyOffline();
    }

    try {
      const newTask = await service.createTask(input);
      
      // Add to local state
      setTaskLists(prev => {
        const next = prev.map(list => {
          if (list.id !== input.listId) return list;
          return {
            ...list,
            tasks: [newTask, ...list.tasks],
            incompleteCount: list.incompleteCount + 1,
          };
        });
        offlineCacheService.saveSnapshot(next);
        return next;
      });

      // Schedule notification if has due date
      if (newTask.due) {
        await scheduleTaskNotification(newTask);
      }

      return newTask;
    } catch (err) {
      console.warn("Failed to create task online, falling back to offline creation:", err);
      return createLocallyOffline();
    }
  }, [service, setTaskLists, setToast]);

  /**
   * Toggle task completion
   */
  const toggleTaskComplete = useCallback(async (listId: string, taskId: string): Promise<boolean> => {
    if (!service) return false;

    // Optimistic update
    const currentTask = taskLists.find(l => l.id === listId)?.tasks.find(t => t.id === taskId);
    if (!currentTask) return false;

    const newStatus: GoogleTaskStatus = currentTask.status === "completed" ? "needsAction" : "completed";
    updateTaskInState(listId, taskId, task => ({ ...task, status: newStatus }));

    const isOffline = !navigator.onLine || taskId.startsWith("temp_");
    if (isOffline) {
      if (newStatus === "completed") {
        historyService.recordCompletion(
          currentTask,
          taskLists.find((l) => l.id === listId)?.title
        );
      } else {
        historyService.recordUncompletion(taskId);
      }
      syncQueueService.enqueue("TOGGLE_COMPLETE", listId, {}, taskId);
      setTaskLists(prev => {
        offlineCacheService.saveSnapshot(prev);
        return prev;
      });
      setToast({ 
        title: newStatus === "completed" ? "Task completed (offline 💾)" : "Task unchecked", 
        type: newStatus === "completed" ? "success" : "info" 
      });
      return true;
    }

    try {
      await service.toggleComplete(listId, taskId);
      
      // Handle notifications based on completion status
      if (newStatus === "completed") {
        // Task completed → cancel notification & record in history
        historyService.recordCompletion(
          currentTask,
          taskLists.find((l) => l.id === listId)?.title
        );
        await cancelTaskNotification(taskId);
      } else {
        // Task uncompleted → remove from history & reschedule if has due date
        historyService.recordUncompletion(taskId);
        if (currentTask.due) {
          await scheduleTaskNotification({ ...currentTask, status: newStatus });
        }
      }

      setTaskLists(prev => {
        offlineCacheService.saveSnapshot(prev);
        return prev;
      });
      
      setToast({ 
        title: newStatus === "completed" ? "Task completed 🎉" : "Task unchecked", 
        type: newStatus === "completed" ? "success" : "info" 
      });
      return true;
    } catch (err) {
      console.warn("Failed to toggle task online, preserving change offline:", err);
      syncQueueService.enqueue("TOGGLE_COMPLETE", listId, {}, taskId);
      setTaskLists(prev => {
        offlineCacheService.saveSnapshot(prev);
        return prev;
      });
      setToast({ 
        title: newStatus === "completed" ? "Task completed (saved offline 💾)" : "Task unchecked", 
        type: newStatus === "completed" ? "success" : "info" 
      });
      return true;
    }
  }, [service, taskLists, updateTaskInState, setTaskLists, setToast]);

  /**
   * Toggle task starred status
   */
  const toggleTaskStar = useCallback(async (listId: string, taskId: string): Promise<boolean> => {
    if (!service) return false;

    // Optimistic update
    const wasStarred = starredIds.has(taskId);
    const newStarredIds = new Set(starredIds);
    if (wasStarred) {
      newStarredIds.delete(taskId);
    } else {
      newStarredIds.add(taskId);
    }
    setStarredIds(newStarredIds);
    updateTaskInState(listId, taskId, task => ({ ...task, isStarred: !wasStarred }));

    try {
      await service.toggleStar(listId, taskId);
      return true;
    } catch (err) {
      // Revert optimistic update
      setStarredIds(starredIds);
      updateTaskInState(listId, taskId, task => ({ ...task, isStarred: wasStarred }));
      const message = err instanceof Error ? err.message : "Failed to star task";
      setToast({ title: "Error", body: message, type: "error" });
      return false;
    }
  }, [service, starredIds, setStarredIds, updateTaskInState, setToast]);

  /**
   * Delete a task
   */
  const deleteTask = useCallback(async (listId: string, taskId: string): Promise<boolean> => {
    const performLocalDelete = () => {
      setTaskLists(prev => {
        const next = prev.map(list => {
          if (list.id !== listId) return list;
          const updatedTasks = list.tasks.filter(t => t.id !== taskId);
          return {
            ...list,
            tasks: updatedTasks,
            incompleteCount: updatedTasks.filter(t => t.status === "needsAction").length,
          };
        });
        offlineCacheService.saveSnapshot(next);
        return next;
      });

      setStarredIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });

      syncQueueService.enqueue("DELETE_TASK", listId, {}, taskId);
      setToast({ title: "Task deleted (offline 💾)", type: "warning" });
      return true;
    };

    const isOffline = !navigator.onLine || taskId.startsWith("temp_");
    if (isOffline || !service) {
      return performLocalDelete();
    }

    try {
      await service.deleteTask(listId, taskId);
      
      // Remove from local state
      setTaskLists(prev => {
        const next = prev.map(list => {
          if (list.id !== listId) return list;
          const updatedTasks = list.tasks.filter(t => t.id !== taskId);
          return {
            ...list,
            tasks: updatedTasks,
            incompleteCount: updatedTasks.filter(t => t.status === "needsAction").length,
          };
        });
        offlineCacheService.saveSnapshot(next);
        return next;
      });

      // Remove from starred
      setStarredIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });

      // Cancel any scheduled notification
      await cancelTaskNotification(taskId);

      setToast({ title: "Task deleted", type: "warning" });
      return true;
    } catch (err) {
      console.warn("Failed to delete task online, falling back to local delete:", err);
      return performLocalDelete();
    }
  }, [service, setTaskLists, setStarredIds, setToast]);

  /**
   * Move task to another list
   */
  const moveTaskToList = useCallback(async (
    fromListId: string, 
    taskId: string, 
    toListId: string
  ): Promise<boolean> => {
    const performLocalMove = () => {
      setTaskLists(prev => {
        const targetTask = prev.find(l => l.id === fromListId)?.tasks.find(t => t.id === taskId);
        if (!targetTask) return prev;
        const movedTask: AppTask = { ...targetTask, listId: toListId };
        const next = prev.map(list => {
          if (list.id === fromListId) {
            const updatedTasks = list.tasks.filter(t => t.id !== taskId);
            return {
              ...list,
              tasks: updatedTasks,
              incompleteCount: updatedTasks.filter(t => t.status === "needsAction").length,
            };
          }
          if (list.id === toListId) {
            return {
              ...list,
              tasks: [movedTask, ...list.tasks],
              incompleteCount: list.incompleteCount + (movedTask.status === "needsAction" ? 1 : 0),
            };
          }
          return list;
        });
        offlineCacheService.saveSnapshot(next);
        return next;
      });

      syncQueueService.enqueue("MOVE_TASK", fromListId, { toListId }, taskId);
      setToast({ title: "Task moved (offline 💾)", type: "info" });
      return true;
    };

    const isOffline = !navigator.onLine || taskId.startsWith("temp_");
    if (isOffline || !service) {
      return performLocalMove();
    }

    try {
      const movedTask = await service.moveToList(fromListId, taskId, toListId);
      
      // Update local state
      setTaskLists(prev => {
        const next = prev.map(list => {
          if (list.id === fromListId) {
            // Remove from source list
            const updatedTasks = list.tasks.filter(t => t.id !== taskId);
            return {
              ...list,
              tasks: updatedTasks,
              incompleteCount: updatedTasks.filter(t => t.status === "needsAction").length,
            };
          }
          if (list.id === toListId) {
            // Add to destination list
            return {
              ...list,
              tasks: [movedTask, ...list.tasks],
              incompleteCount: list.incompleteCount + (movedTask.status === "needsAction" ? 1 : 0),
            };
          }
          return list;
        });
        offlineCacheService.saveSnapshot(next);
        return next;
      });

      setToast({ title: "Task moved", type: "success" });
      return true;
    } catch (err) {
      console.warn("Failed to move task online, falling back to local move:", err);
      return performLocalMove();
    }
  }, [service, setTaskLists, setToast]);

  /**
   * Clear completed tasks in a list
   */
  const clearCompletedTasks = useCallback(async (listId: string): Promise<boolean> => {
    if (!service) return false;

    try {
      await service.clearCompleted(listId);
      
      // Remove completed tasks from local state
      setTaskLists(prev => prev.map(list => {
        if (list.id !== listId) return list;
        return {
          ...list,
          tasks: list.tasks.filter(t => t.status === "needsAction"),
        };
      }));

      setToast({ title: "Completed tasks cleared", type: "success" });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to clear tasks";
      setToast({ title: "Error", body: message, type: "error" });
      return false;
    }
  }, [service, setTaskLists, setToast]);

  /**
   * Get all starred tasks across all lists
   */
  const getStarredTasks = useCallback((): AppTask[] => {
    return taskLists.flatMap(list => 
      list.tasks.filter(task => starredIds.has(task.id))
    );
  }, [taskLists, starredIds]);

  /**
   * Create a subtask under a parent task
   */
  const createSubtask = useCallback(async (
    listId: string, 
    parentTaskId: string, 
    title: string
  ): Promise<AppTask | null> => {
    const createSubtaskOffline = () => {
      const tempId = `temp_subtask_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newSubtask: AppTask = {
        kind: "tasks#task",
        id: tempId,
        etag: "",
        selfLink: "",
        position: "0",
        title,
        status: "needsAction",
        isStarred: false,
        listId,
        parent: parentTaskId,
        updated: new Date().toISOString(),
      };

      setTaskLists(prev => {
        const next = prev.map(list => {
          if (list.id !== listId) return list;
          const parentIndex = list.tasks.findIndex(t => t.id === parentTaskId);
          const tasks = [...list.tasks];
          if (parentIndex !== -1) {
            tasks.splice(parentIndex + 1, 0, newSubtask);
          } else {
            tasks.unshift(newSubtask);
          }
          return {
            ...list,
            tasks,
            incompleteCount: tasks.filter(t => t.status === "needsAction").length,
          };
        });
        offlineCacheService.saveSnapshot(next);
        return next;
      });

      syncQueueService.enqueue("CREATE_SUBTASK", listId, { title, tempId }, parentTaskId);
      setToast({ title: "Subtask added (offline 💾)", type: "info" });
      return newSubtask;
    };

    const isOffline = !navigator.onLine || parentTaskId.startsWith("temp_");
    if (isOffline || !service) {
      return createSubtaskOffline();
    }

    try {
      const input: CreateTaskInput = {
        listId,
        title,
        parentId: parentTaskId,
      };
      const newTask = await service.createTask(input);
      
      // Add to local state after the parent
      setTaskLists(prev => {
        const next = prev.map(list => {
          if (list.id !== listId) return list;
          
          // Find parent task index and insert after it
          const parentIndex = list.tasks.findIndex(t => t.id === parentTaskId);
          const tasks = [...list.tasks];
          if (parentIndex !== -1) {
            tasks.splice(parentIndex + 1, 0, newTask);
          } else {
            tasks.unshift(newTask);
          }
          
          return {
            ...list,
            tasks,
            incompleteCount: tasks.filter(t => t.status === "needsAction").length,
          };
        });
        offlineCacheService.saveSnapshot(next);
        return next;
      });

      setToast({ title: "Subtask created", type: "success" });
      return newTask;
    } catch (err) {
      console.warn("Failed to create subtask online, falling back to offline creation:", err);
      return createSubtaskOffline();
    }
  }, [service, setTaskLists, setToast]);

  /**
   * Unindent a subtask (remove its parent, making it a top-level task)
   */
  const unindentTask = useCallback(async (listId: string, taskId: string): Promise<boolean> => {
    if (!service) return false;

    try {
      // Move task with no parent (makes it top-level)
      await service.reorderTask(listId, taskId, undefined, undefined);
      
      // Update local state
      updateTaskInState(listId, taskId, task => ({ ...task, parent: undefined }));

      setToast({ title: "Task unindented", type: "info" });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to unindent task";
      setToast({ title: "Error", body: message, type: "error" });
      return false;
    }
  }, [service, updateTaskInState, setToast]);

  /**
   * Indent a task (make it a subtask of the previous task)
   */
  const indentTask = useCallback(async (listId: string, taskId: string): Promise<boolean> => {
    if (!service) return false;

    // Find the task and the previous task
    const list = taskLists.find(l => l.id === listId);
    if (!list) return false;

    const taskIndex = list.tasks.findIndex(t => t.id === taskId);
    if (taskIndex <= 0) {
      setToast({ title: "Cannot indent", body: "No task above to indent under", type: "warning" });
      return false;
    }

    const previousTask = list.tasks[taskIndex - 1];

    try {
      await service.reorderTask(listId, taskId, undefined, previousTask.id);
      
      // Update local state
      updateTaskInState(listId, taskId, task => ({ ...task, parent: previousTask.id }));

      setToast({ title: "Task indented", type: "info" });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to indent task";
      setToast({ title: "Error", body: message, type: "error" });
      return false;
    }
  }, [service, taskLists, updateTaskInState, setToast]);

  /**
   * Update a task's title, notes, and/or due date
   */
  const updateTask = useCallback(async (
    listId: string, 
    taskId: string, 
    title: string, 
    notes?: string,
    due?: Date
  ): Promise<boolean> => {
    // Get current task for notification handling
    const currentTask = taskLists.find(l => l.id === listId)?.tasks.find(t => t.id === taskId);

    // Optimistic update
    updateTaskInState(listId, taskId, task => ({ 
      ...task, 
      title,
      notes: notes ?? task.notes,
      due: due ? due.toISOString() : task.due,
    }));

    const updateLocallyOffline = () => {
      syncQueueService.enqueue(
        "UPDATE_TASK",
        listId,
        {
          title,
          notes,
          due: due ? due.toISOString() : undefined,
        },
        taskId
      );
      setTaskLists(prev => {
        offlineCacheService.saveSnapshot(prev);
        return prev;
      });
      setToast({ title: "Task updated (offline 💾)", type: "info" });
      return true;
    };

    const isOffline = !navigator.onLine || taskId.startsWith("temp_");
    if (isOffline || !service) {
      return updateLocallyOffline();
    }

    try {
      await service.updateTask({ listId, id: taskId, title, notes, due });
      
      setTaskLists(prev => {
        offlineCacheService.saveSnapshot(prev);
        return prev;
      });

      // Reschedule notification if due date changed
      if (due !== undefined && currentTask && currentTask.status !== 'completed') {
        // Cancel existing and schedule with new time
        const updatedTask: AppTask = { 
          ...currentTask, 
          title, 
          notes: notes ?? currentTask.notes,
          due: due.toISOString() 
        };
        await scheduleTaskNotification(updatedTask);
      }
      
      return true;
    } catch (err) {
      console.warn("Failed to update task online, falling back to local update:", err);
      return updateLocallyOffline();
    }
  }, [service, taskLists, updateTaskInState, setTaskLists, setToast]);

  /**
   * Reorder tasks locally (optimistic, no API call as Google Tasks API doesn't support batch reorder)
   */
  const reorderTasksLocally = useCallback((listId: string, reorderedTasks: AppTask[]) => {
    setTaskLists(prev => prev.map(list => {
      if (list.id !== listId) return list;
      return {
        ...list,
        tasks: reorderedTasks,
        incompleteCount: reorderedTasks.filter(t => t.status === "needsAction").length,
      };
    }));
  }, [setTaskLists]);

  return {
    // Data helpers
    getStarredTasks,

    // Actions
    createTask,
    createSubtask,
    updateTask,
    toggleTaskComplete,
    toggleTaskStar,
    deleteTask,
    moveTaskToList,
    clearCompletedTasks,
    indentTask,
    unindentTask,
    reorderTasksLocally,
  };
}
