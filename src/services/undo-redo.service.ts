/**
 * Undo / Redo Service
 * 
 * Manages an in-memory stack of reversible user actions (complete, uncomplete,
 * delete, create, edit, star) with automatic capacity bounding (FIFO eviction)
 * and subscriber notifications for reactive UI updates.
 */

export type UndoableActionType =
  | "TOGGLE_COMPLETE"
  | "DELETE_TASK"
  | "CREATE_TASK"
  | "UPDATE_TASK"
  | "STAR_TASK"
  | "MOVE_TASK";

export interface UndoAction {
  id: string;
  type: UndoableActionType;
  description: string;
  descriptionAr: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  timestamp: number;
}

const MAX_STACK_SIZE = 30;

class UndoRedoService {
  private undoStack: UndoAction[] = [];
  private redoStack: UndoAction[] = [];
  private subscribers: Set<() => void> = new Set();
  private isExecuting = false;

  public subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify(): void {
    this.subscribers.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error("Error in undo/redo subscriber:", err);
      }
    });
  }

  public push(action: UndoAction): void {
    // If currently executing an undo or redo step, don't record new user action
    if (this.isExecuting) return;

    this.undoStack.push(action);
    if (this.undoStack.length > MAX_STACK_SIZE) {
      this.undoStack.shift(); // Evict oldest
    }
    // Any new user action invalidates the redo stack
    this.redoStack = [];
    this.notify();
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0 && !this.isExecuting;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0 && !this.isExecuting;
  }

  public getUndoAction(): UndoAction | undefined {
    return this.undoStack[this.undoStack.length - 1];
  }

  public getRedoAction(): UndoAction | undefined {
    return this.redoStack[this.redoStack.length - 1];
  }

  public getUndoCount(): number {
    return this.undoStack.length;
  }

  public getRedoCount(): number {
    return this.redoStack.length;
  }

  public async undo(): Promise<UndoAction | null> {
    if (!this.canUndo()) return null;
    const action = this.undoStack.pop();
    if (!action) return null;

    this.isExecuting = true;
    try {
      await action.undo();
      this.redoStack.push(action);
      if (this.redoStack.length > MAX_STACK_SIZE) {
        this.redoStack.shift();
      }
      return action;
    } catch (err) {
      console.error("Failed to execute undo action:", err);
      throw err;
    } finally {
      this.isExecuting = false;
      this.notify();
    }
  }

  public async redo(): Promise<UndoAction | null> {
    if (!this.canRedo()) return null;
    const action = this.redoStack.pop();
    if (!action) return null;

    this.isExecuting = true;
    try {
      await action.redo();
      this.undoStack.push(action);
      if (this.undoStack.length > MAX_STACK_SIZE) {
        this.undoStack.shift();
      }
      return action;
    } catch (err) {
      console.error("Failed to execute redo action:", err);
      throw err;
    } finally {
      this.isExecuting = false;
      this.notify();
    }
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }
}

export const undoRedoService = new UndoRedoService();
