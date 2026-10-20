/**
 * Application-specific type definitions
 * 
 * These extend Google API types with app-specific properties
 * that are stored locally or derived.
 */

import { GoogleTask, GoogleTaskList, GoogleTaskStatus } from "./google-tasks";

// =============================================================================
// App Task Types
// =============================================================================

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type RecurrenceEndType = 'never' | 'on_date' | 'after_occurrences';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number; // e.g. 1 (every week)
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
  time?: string; // "HH:mm"
  endType: RecurrenceEndType;
  endDate?: string; // ISO date
  endCount?: number; // count
  occurrenceCount?: number;
}

/**
 * Extended task with app-specific properties
 */
export interface AppTask extends GoogleTask {
  /** Whether the task is starred (stored locally) */
  isStarred: boolean;
  /** Reference to parent task list ID */
  listId: string;
  /** Subtasks (eagerly loaded children) */
  subtasks?: AppTask[];
  /** Exact time of day (HH:mm) stored locally */
  exactTime?: string;
  /** Recurrence rule for repeating tasks */
  recurrence?: RecurrenceRule;
}

/**
 * Extended task list with app-specific properties
 */
export interface AppTaskList extends GoogleTaskList {
  /** Tasks in this list (eagerly loaded) */
  tasks: AppTask[];
  /** Whether this list is visible in the main view */
  isVisible: boolean;
  /** Number of incomplete tasks (computed) */
  incompleteCount: number;
}

/**
 * Simplified task for creating new tasks
 */
export interface CreateTaskInput {
  title: string;
  notes?: string;
  due?: Date;
  parentId?: string;
  listId: string;
  exactTime?: string;
  recurrence?: RecurrenceRule;
}

/**
 * Simplified task for updating tasks
 */
export interface UpdateTaskInput {
  id: string;
  listId: string;
  title?: string;
  notes?: string;
  due?: Date;
  status?: GoogleTaskStatus;
  exactTime?: string;
  recurrence?: RecurrenceRule;
}

// =============================================================================
// View Types
// =============================================================================

/**
 * Possible views in the sidebar
 */
export type SidebarView = "all" | "starred" | "list" | "eisenhower" | "analytics" | "trash";

/**
 * Current view state
 */
export interface ViewState {
  view: SidebarView;
  /** Active list ID when view is "list" */
  activeListId?: string;
  /** Active list index for compatibility */
  activeListIndex: number;
}

/**
 * Sort options for tasks
 */
export type TaskSortOption = 
  | "my_order"    // Default Google ordering
  | "date"        // By last modified
  | "deadline"    // By due date
  | "starred"     // Starred first
  | "title";      // Alphabetical

// =============================================================================
// Starred Storage
// =============================================================================

/**
 * Starred tasks storage structure
 * Maps task ID to starred status
 */
export interface StarredTasksStore {
  [taskId: string]: boolean;
}

// =============================================================================
// Loading States
// =============================================================================

/**
 * Loading state for async operations
 */
export interface LoadingState {
  isLoading: boolean;
  error?: string;
}

/**
 * Combined state for data + loading
 */
export interface AsyncState<T> extends LoadingState {
  data: T;
}

// =============================================================================
// UI State
// =============================================================================

/**
 * Toast/notification message
 */
export interface ToastMessage {
  id?: string;
  title: string;
  body?: string;
  type: "info" | "warning" | "success" | "error";
  duration?: number;
}

/**
 * Drag and drop state
 */
export interface DragState {
  isDragging: boolean;
  activeId: string | null;
  overId: string | null;
}

// =============================================================================
// User & Auth
// =============================================================================

/**
 * User profile from Google OAuth
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

/**
 * Authentication state
 */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  accessToken: string | null;
}

// =============================================================================
// App State Shape
// =============================================================================

/**
 * Complete app state shape (for offline sync preparation)
 */
export interface AppState {
  auth: AuthState;
  taskLists: AppTaskList[];
  starredTasks: StarredTasksStore;
  viewState: ViewState;
  ui: {
    toast: ToastMessage | null;
    isOnline: boolean;
  };
}
