/**
 * Tasks Hook
 * 
 * Provides task data and operations to components.
 */

import { useCallback, useRef } from "react";
import { useRecoilState, useSetRecoilState } from "recoil";
import { taskListsAtom, toastAtom, starredTaskIdsAtom } from "../store";
import { useServices } from "./useServices";
import { AppTask, CreateTaskInput, RecurrenceRule } from "../types/app";
import { GoogleTaskStatus } from "../types/google-tasks";
import { 
  scheduleTaskNotification, 
  cancelTaskNotification 
} from "../services/notification.service";
import { historyService, cleanTitleFromQuadrant } from "../services/history.service";
import { recurrenceService } from "../services/recurrence.service";
import { offlineCacheService } from "../services/offline-cache.service";
import { syncQueueService } from "../services/sync-queue.service";
import { undoRedoService } from "../services/undo-redo.service";
import { trashService } from "../services/trash.service";
import { useTranslation } from "../i18n";

export function useTasks() {
  const { t } = useTranslation();
  const { tasks: service, starred } = useServices();
  const [taskLists, setTaskLists] = useRecoilState(taskListsAtom);
  const [starredIds, setStarredIds] = useRecoilState(starredTaskIdsAtom);
  const setToast = useSetRecoilState(toastAtom);

  const createTaskRef = useRef<((input: CreateTaskInput, isUndo?: boolean) => Promise<AppTask | null>) | null>(null);
  const deleteTaskRef = useRef<((listId: string, taskId: string, isUndo?: boolean) => Promise<boolean>) | null>(null);
  const restoreTaskRef = useRef<((listId: string, task: AppTask) => Promise<void>) | null>(null);
  const toggleCompleteRef = useRef<((listId: string, taskId: string, isUndo?: boolean) => Promise<boolean>) | null>(null);
  const toggleStarRef = useRef<((listId: string, taskId: string, isUndo?: boolean) => Promise<boolean>) | null>(null);
  const updateTaskRef = useRef<((listId: string, taskId: string, title: string, notes?: string, due?: Date, exactTime?: string, recurrence?: RecurrenceRule, isUndo?: boolean) => Promise<boolean>) | null>(null);

  /**
   * Helper to update a task in local state and persist snapshot
   */
  const updateTaskInState = useCallback((listId: string, taskId: string, updater: (task: AppTask) => AppTask) => {
    setTaskLists(prev => {
      const next = prev.map(list => {
        if (list.id !== listId) return list;
        
        const updatedTasks = list.tasks.map(task => 
          task.id === taskId ? updater(task) : task
        );
        
        return {
          ...list,
          tasks: updatedTasks,
          incompleteCount: updatedTasks.filter(t => t.status === "needsAction").length,
        };
      });
      offlineCacheService.saveSnapshot(next);
      return next;
    });
  }, [setTaskLists]);

  /**
   * Helper to remove a task from local state, unstar, and cancel notifications
   */
  const removeTaskFromLocalState = useCallback((listId: string, taskId: string) => {
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
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
    starred.unstar(taskId).catch(console.warn);
    cancelTaskNotification(taskId);
  }, [setTaskLists, setStarredIds, starred]);

  /**
   * Helper to add a new task to local state and persist snapshot
   */
  const addTaskToLocalState = useCallback((listId: string, task: AppTask) => {
    setTaskLists(prev => {
      const next = prev.map(list => {
        if (list.id !== listId) return list;
        return {
          ...list,
          tasks: [task, ...list.tasks],
          incompleteCount: list.incompleteCount + 1,
        };
      });
      offlineCacheService.saveSnapshot(next);
      return next;
    });

    if (task.due) {
      scheduleTaskNotification(task).catch(console.warn);
    }
  }, [setTaskLists]);

  /**
   * Helper to move a task between lists in local state
   */
  const moveTaskInLocalState = useCallback((fromListId: string, taskId: string, toListId: string, movedTaskData?: AppTask) => {
    setTaskLists(prev => {
      const targetTask = movedTaskData || prev.find(l => l.id === fromListId)?.tasks.find(t => t.id === taskId);
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
  }, [setTaskLists]);

  /**
   * Helper to restore a previously deleted task (used by Undo)
   */
  const restoreTask = useCallback(async (listId: string, task: AppTask) => {
    let resolvedListId = listId;
    setTaskLists(prev => {
      const targetExists = prev.some(l => l.id === listId);
      resolvedListId = targetExists ? listId : (prev[0]?.id || listId);
      const next = prev.map(list => {
        if (list.id !== resolvedListId) return list;
        return {
          ...list,
          tasks: [task, ...list.tasks],
          incompleteCount: list.incompleteCount + (task.status === "needsAction" ? 1 : 0),
        };
      });
      offlineCacheService.saveSnapshot(next);
      return next;
    });

    if (task.isStarred) {
      setStarredIds(prev => new Set(prev).add(task.id));
      starred.star(task.id).catch(console.warn);
    }

    if (!navigator.onLine || !service || task.id.startsWith("temp_")) {
      syncQueueService.enqueue(
        "CREATE_TASK",
        resolvedListId,
        {
          title: task.title,
          notes: task.notes,
          due: task.due,
          parentId: task.parent,
          tempId: task.id,
        },
        task.id
      );
    } else {
      try {
        await service.createTask({
          title: task.title,
          notes: task.notes,
          due: task.due ? new Date(task.due) : undefined,
          listId: resolvedListId,
          parentId: task.parent,
        });
      } catch (e) {
        console.warn("Failed to restore task online:", e);
      }
    }
  }, [service, starred, setTaskLists, setStarredIds]);
  restoreTaskRef.current = restoreTask;

  /**
   * Create a new task (with offline-first queue support and Undo history)
   */
  const createTask = useCallback(async (input: CreateTaskInput, isUndoRedoAction = false): Promise<AppTask | null> => {
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
        exactTime: input.exactTime,
        recurrence: input.recurrence,
      };

      if (input.recurrence) {
        recurrenceService.saveRule(tempId, input.recurrence);
      }

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

      addTaskToLocalState(input.listId, offlineTask);

      if (!isUndoRedoAction) {
        const created = { ...offlineTask };
        undoRedoService.push({
          id: `create_${created.id}_${Date.now()}`,
          type: "CREATE_TASK",
          description: `Create "${created.title}"`,
          descriptionAr: `إنشاء "${created.title}"`,
          undo: async () => {
            await deleteTaskRef.current?.(created.listId, created.id, true);
          },
          redo: async () => {
            await createTaskRef.current?.(input, true);
          },
          timestamp: Date.now(),
        });
      }

      setToast({ title: t("tasks.taskAddedOfflineToast"), type: "info" });
      return offlineTask;
    };

    if (!navigator.onLine || !service) {
      return createLocallyOffline();
    }

    try {
      const createdTask = await service.createTask(input);
      const newTask: AppTask = {
        ...createdTask,
        exactTime: input.exactTime,
        recurrence: input.recurrence,
      };

      if (input.recurrence) {
        recurrenceService.saveRule(newTask.id, input.recurrence);
      }
      
      addTaskToLocalState(input.listId, newTask);

      if (!isUndoRedoAction) {
        const created = { ...newTask };
        undoRedoService.push({
          id: `create_${created.id}_${Date.now()}`,
          type: "CREATE_TASK",
          description: `Create "${created.title}"`,
          descriptionAr: `إنشاء "${created.title}"`,
          undo: async () => {
            await deleteTaskRef.current?.(created.listId, created.id, true);
          },
          redo: async () => {
            await createTaskRef.current?.(input, true);
          },
          timestamp: Date.now(),
        });
      }

      return newTask;
    } catch (err) {
      console.warn("Failed to create task online, falling back to offline creation:", err);
      return createLocallyOffline();
    }
  }, [service, addTaskToLocalState, setToast, t]);
  createTaskRef.current = createTask;
  createTaskRef.current = createTask;

  /**
   * Toggle task completion
   */
  const toggleTaskComplete = useCallback(async (listId: string, taskId: string, isUndoRedoAction = false): Promise<boolean> => {
    if (!service) return false;

    // Optimistic update
    const currentTask = taskLists.find(l => l.id === listId)?.tasks.find(t => t.id === taskId);
    if (!currentTask) return false;

    const newStatus: GoogleTaskStatus = currentTask.status === "completed" ? "needsAction" : "completed";
    updateTaskInState(listId, taskId, task => ({ ...task, status: newStatus }));

    // Optimistically update history service immediately
    const listTitle = taskLists.find(l => l.id === listId)?.title;
    if (newStatus === "completed") {
      historyService.recordCompletion(
        { ...currentTask, status: newStatus },
        listTitle
      );
      // Spawn next occurrence if recurring
      if (currentTask.recurrence || recurrenceService.getRule(taskId)) {
        recurrenceService.handleTaskCompletion(currentTask, async (nextInput) => {
          const res = await createTaskRef.current?.(nextInput);
          return Boolean(res);
        });
      }
    } else {
      historyService.recordUncompletion(taskId);
    }

    if (!isUndoRedoAction) {
      const taskTitle = currentTask.title;
      const isCompletedNow = newStatus === "completed";
      undoRedoService.push({
        id: `toggle_${taskId}_${Date.now()}`,
        type: "TOGGLE_COMPLETE",
        description: isCompletedNow ? `Complete "${taskTitle}"` : `Uncheck "${taskTitle}"`,
        descriptionAr: isCompletedNow ? `إكمال "${taskTitle}"` : `إلغاء إكمال "${taskTitle}"`,
        undo: async () => {
          await toggleCompleteRef.current?.(listId, taskId, true);
        },
        redo: async () => {
          await toggleCompleteRef.current?.(listId, taskId, true);
        },
        timestamp: Date.now(),
      });
    }

    const isOffline = !navigator.onLine || taskId.startsWith("temp_");
    if (isOffline) {
      syncQueueService.enqueue("TOGGLE_COMPLETE", listId, {}, taskId);
      setTaskLists(prev => {
        offlineCacheService.saveSnapshot(prev);
        return prev;
      });
      setToast({ 
        title: newStatus === "completed" ? `${t("tasks.taskCompletedToast")} (offline 💾)` : t("tasks.taskUncheckedToast"), 
        type: newStatus === "completed" ? "success" : "info" 
      });
      return true;
    }

    try {
      await service.toggleComplete(listId, taskId);
      
      // Handle notifications based on completion status
      if (newStatus === "completed") {
        await cancelTaskNotification(taskId);
      } else {
        if (currentTask.due) {
          await scheduleTaskNotification({ ...currentTask, status: newStatus });
        }
      }

      setTaskLists(prev => {
        offlineCacheService.saveSnapshot(prev);
        return prev;
      });
      
      setToast({ 
        title: newStatus === "completed" ? `${t("tasks.taskCompletedToast")} 🎉` : t("tasks.taskUncheckedToast"), 
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
        title: newStatus === "completed" ? `${t("tasks.taskCompletedToast")} (offline 💾)` : t("tasks.taskUncheckedToast"), 
        type: newStatus === "completed" ? "success" : "info" 
      });
      return true;
    }
  }, [service, taskLists, updateTaskInState, setTaskLists, setToast, t]);
  toggleCompleteRef.current = toggleTaskComplete;

  /**
   * Toggle task starred status
   */
  const toggleTaskStar = useCallback(async (listId: string, taskId: string, isUndoRedoAction = false): Promise<boolean> => {
    if (!service) return false;

    const currentTask = taskLists.find(l => l.id === listId)?.tasks.find(t => t.id === taskId);

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

    if (!isUndoRedoAction && currentTask) {
      const taskTitle = currentTask.title;
      const willBeStarred = !wasStarred;
      undoRedoService.push({
        id: `star_${taskId}_${Date.now()}`,
        type: "STAR_TASK",
        description: willBeStarred ? `Star "${taskTitle}"` : `Unstar "${taskTitle}"`,
        descriptionAr: willBeStarred ? `تمييز بنجمة "${taskTitle}"` : `إزالة النجمة عن "${taskTitle}"`,
        undo: async () => {
          await toggleStarRef.current?.(listId, taskId, true);
        },
        redo: async () => {
          await toggleStarRef.current?.(listId, taskId, true);
        },
        timestamp: Date.now(),
      });
    }

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
  toggleStarRef.current = toggleTaskStar;

  /**
   * Delete a task
   */
  const deleteTask = useCallback(async (listId: string, taskId: string, isUndoRedoAction = false): Promise<boolean> => {
    const listObj = taskLists.find(l => l.id === listId);
    const taskToDelete = listObj?.tasks.find(t => t.id === taskId);
    if (!isUndoRedoAction && taskToDelete) {
      trashService.moveToTrash(taskToDelete, listObj?.title);
      const savedTask = { ...taskToDelete };
      undoRedoService.push({
        id: `delete_${taskId}_${Date.now()}`,
        type: "DELETE_TASK",
        description: `Delete "${savedTask.title}"`,
        descriptionAr: `حذف "${savedTask.title}"`,
        undo: async () => {
          trashService.permanentDelete(savedTask.id);
          await restoreTaskRef.current?.(listId, savedTask);
        },
        redo: async () => {
          await deleteTaskRef.current?.(listId, taskId, true);
        },
        timestamp: Date.now(),
      });
    }

    const performLocalDelete = () => {
      removeTaskFromLocalState(listId, taskId);
      syncQueueService.enqueue("DELETE_TASK", listId, {}, taskId);
      setToast({ title: t("tasks.taskDeletedToast"), type: "warning" });
      return true;
    };

    const isOffline = !navigator.onLine || taskId.startsWith("temp_");
    if (isOffline || !service) {
      return performLocalDelete();
    }

    try {
      await service.deleteTask(listId, taskId);
      removeTaskFromLocalState(listId, taskId);
      setToast({ title: t("tasks.taskDeletedToast"), type: "warning" });
      return true;
    } catch (err) {
      console.warn("Failed to delete task online, falling back to local delete:", err);
      return performLocalDelete();
    }
  }, [service, taskLists, removeTaskFromLocalState, setToast, t]);
  deleteTaskRef.current = deleteTask;

  /**
   * Move task to another list
   */
  const moveTaskToList = useCallback(async (
    fromListId: string, 
    taskId: string, 
    toListId: string
  ): Promise<boolean> => {
    const performLocalMove = () => {
      moveTaskInLocalState(fromListId, taskId, toListId);
      syncQueueService.enqueue("MOVE_TASK", fromListId, { toListId }, taskId);
      setToast({ title: t("tasks.taskMovedOfflineToast"), type: "info" });
      return true;
    };

    const isOffline = !navigator.onLine || taskId.startsWith("temp_");
    if (isOffline || !service) {
      return performLocalMove();
    }

    try {
      const movedTask = await service.moveToList(fromListId, taskId, toListId);
      moveTaskInLocalState(fromListId, taskId, toListId, movedTask);
      setToast({ title: t("tasks.taskMovedToast"), type: "success" });
      return true;
    } catch (err) {
      console.warn("Failed to move task online, falling back to local move:", err);
      return performLocalMove();
    }
  }, [service, moveTaskInLocalState, setToast, t]);

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

      setToast({ title: t("tasks.completedClearedToast"), type: "success" });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to clear tasks";
      setToast({ title: "Error", body: message, type: "error" });
      return false;
    }
  }, [service, setTaskLists, setToast, t]);

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
    // 1. Resolve which list actually contains parentTaskId
    let targetListId = listId;
    let actualParent = taskLists.flatMap(l => l.tasks || []).find(t => t.id === parentTaskId);

    // If not found by ID, attempt lookup by normalized title
    if (!actualParent) {
      const normInput = cleanTitleFromQuadrant(parentTaskId)
        .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
        .replace(/[أإآ]/g, "ا")
        .replace(/ة/g, "ه")
        .replace(/ى/g, "ي")
        .trim()
        .toLowerCase();

      for (const l of taskLists) {
        const found = (l.tasks || []).find(t => {
          const normT = cleanTitleFromQuadrant(t.title)
            .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
            .replace(/[أإآ]/g, "ا")
            .replace(/ة/g, "ه")
            .replace(/ى/g, "ي")
            .trim()
            .toLowerCase();
          return normT === normInput || (normInput.length >= 4 && normT.includes(normInput));
        });
        if (found) {
          actualParent = found;
          break;
        }
      }
    }

    if (actualParent) {
      const parentList = taskLists.find(l => (l.tasks || []).some(t => t.id === actualParent!.id));
      if (parentList) {
        targetListId = parentList.id;
        parentTaskId = actualParent.id;
      }
    } else {
      // If parent task is truly not found anywhere, safely fall back to creating a regular task
      console.warn("Parent task not found for subtask. Creating as regular task to avoid orphan subtask:", parentTaskId, title);
      return createTask({ listId: targetListId, title });
    }

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
        listId: targetListId,
        parent: parentTaskId,
        updated: new Date().toISOString(),
      };

      setTaskLists(prev => {
        const next = prev.map(list => {
          if (list.id !== targetListId) return list;
          const parentIndex = list.tasks.findIndex(t => t.id === parentTaskId);
          const tasks = [...list.tasks];
          if (parentIndex !== -1) {
            tasks.splice(parentIndex + 1, 0, newSubtask);
          } else {
            tasks.push(newSubtask);
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

      syncQueueService.enqueue("CREATE_SUBTASK", targetListId, { title, tempId }, parentTaskId);
      setToast({ title: t("tasks.subtaskAddedOfflineToast"), type: "info" });
      return newSubtask;
    };

    const isOffline = !navigator.onLine || parentTaskId.startsWith("temp_");
    if (isOffline || !service) {
      return createSubtaskOffline();
    }

    try {
      const input: CreateTaskInput = {
        listId: targetListId,
        title,
        parentId: parentTaskId,
      };
      const newTask = await service.createTask(input);
      
      // Add to local state after the parent
      setTaskLists(prev => {
        const next = prev.map(list => {
          if (list.id !== targetListId) return list;
          
          const parentIndex = list.tasks.findIndex(t => t.id === parentTaskId);
          const tasks = [...list.tasks];
          if (parentIndex !== -1) {
            tasks.splice(parentIndex + 1, 0, newTask);
          } else {
            tasks.push(newTask);
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

      setToast({ title: t("tasks.subtaskCreatedToast"), type: "success" });
      return newTask;
    } catch (err) {
      console.warn("Failed to create subtask online, falling back to offline creation:", err);
      return createSubtaskOffline();
    }
  }, [service, taskLists, createTask, setTaskLists, setToast, t]);

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

      setToast({ title: t("tasks.taskUnindentedToast"), type: "info" });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to unindent task";
      setToast({ title: "Error", body: message, type: "error" });
      return false;
    }
  }, [service, updateTaskInState, setToast, t]);

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
      setToast({ title: t("tasks.cannotIndentToast"), body: t("tasks.noTaskAboveToIndent"), type: "warning" });
      return false;
    }

    const previousTask = list.tasks[taskIndex - 1];

    try {
      await service.reorderTask(listId, taskId, undefined, previousTask.id);
      
      // Update local state
      updateTaskInState(listId, taskId, task => ({ ...task, parent: previousTask.id }));

      setToast({ title: t("tasks.taskIndentedToast"), type: "info" });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to indent task";
      setToast({ title: "Error", body: message, type: "error" });
      return false;
    }
  }, [service, taskLists, updateTaskInState, setToast, t]);

  /**
   * Update a task's title, notes, and/or due date
   */
  const updateTask = useCallback(async (
    listId: string, 
    taskId: string, 
    title: string, 
    notes?: string,
    due?: Date,
    exactTime?: string,
    recurrence?: RecurrenceRule,
    isUndoRedoAction = false
  ): Promise<boolean> => {
    // Get current task for notification handling
    const currentTask = taskLists.find(l => l.id === listId)?.tasks.find(t => t.id === taskId);
    if (!isUndoRedoAction && currentTask) {
      const oldTitle = currentTask.title;
      const oldNotes = currentTask.notes;
      const oldDue = currentTask.due ? new Date(currentTask.due) : undefined;
      const oldExactTime = currentTask.exactTime;
      const oldRecurrence = currentTask.recurrence;
      undoRedoService.push({
        id: `update_${taskId}_${Date.now()}`,
        type: "UPDATE_TASK",
        description: `Edit "${title}"`,
        descriptionAr: `تعديل "${title}"`,
        undo: async () => {
          await updateTaskRef.current?.(listId, taskId, oldTitle, oldNotes, oldDue, oldExactTime, oldRecurrence, true);
        },
        redo: async () => {
          await updateTaskRef.current?.(listId, taskId, title, notes, due, exactTime, recurrence, true);
        },
        timestamp: Date.now(),
      });
    }

    if (recurrence !== undefined) {
      if (recurrence) {
        recurrenceService.saveRule(taskId, recurrence);
      } else {
        recurrenceService.removeRule(taskId);
      }
    }

    // Optimistic update
    updateTaskInState(listId, taskId, task => ({ 
      ...task, 
      title,
      notes: notes ?? task.notes,
      due: due ? due.toISOString() : task.due,
      exactTime: exactTime !== undefined ? exactTime : task.exactTime,
      recurrence: recurrence !== undefined ? recurrence : task.recurrence,
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

      // Reschedule notification for updated offline task
      const finalDue = due !== undefined ? (due ? due.toISOString() : undefined) : currentTask?.due;
      const finalExactTime = exactTime !== undefined ? exactTime : currentTask?.exactTime;
      if (finalDue && currentTask && currentTask.status !== "completed") {
        const updatedOfflineTask: AppTask = {
          ...currentTask,
          id: taskId,
          listId,
          title,
          notes: notes !== undefined ? notes : currentTask?.notes,
          due: finalDue,
          exactTime: finalExactTime,
          recurrence: recurrence !== undefined ? recurrence : currentTask?.recurrence,
        };
        scheduleTaskNotification(updatedOfflineTask);
      } else if (!finalDue && currentTask) {
        cancelTaskNotification(taskId);
      }

      setToast({ title: t("tasks.taskUpdatedOfflineToast"), type: "info" });
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

      // Reschedule notification if task has due date
      const finalDue = due !== undefined ? (due ? due.toISOString() : undefined) : currentTask?.due;
      const finalExactTime = exactTime !== undefined ? exactTime : currentTask?.exactTime;
      if (finalDue && currentTask && currentTask.status !== 'completed') {
        const updatedTask: AppTask = { 
          ...currentTask, 
          title, 
          notes: notes !== undefined ? notes : currentTask.notes,
          due: finalDue,
          exactTime: finalExactTime,
          recurrence: recurrence !== undefined ? recurrence : currentTask.recurrence,
        };
        await scheduleTaskNotification(updatedTask);
      } else if (!finalDue && currentTask) {
        await cancelTaskNotification(taskId);
      }
      
      return true;
    } catch (err) {
      console.warn("Failed to update task online, falling back to local update:", err);
      return updateLocallyOffline();
    }
  }, [service, taskLists, updateTaskInState, setTaskLists, setToast, t]);
  updateTaskRef.current = updateTask;

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
    restoreTask,
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
