/**
 * Simplified Recoil Atoms
 * 
 * These atoms hold the minimal state needed.
 * Business logic is in services, not selectors.
 */

import { atom } from "recoil";
import { AppTaskList, UserProfile, ViewState, ToastMessage } from "../types/app";

// =============================================================================
// Auth State
// =============================================================================

export const accessTokenAtom = atom<string | null>({
  key: "accessTokenV2",
  default: null,
});

export const userProfileAtom = atom<UserProfile | null>({
  key: "userProfileV2",
  default: null,
});

export const authLoadingAtom = atom<boolean>({
  key: "authLoadingV2",
  default: true,
});

// =============================================================================
// Task Lists State
// =============================================================================

export const taskListsAtom = atom<AppTaskList[]>({
  key: "taskLists",
  default: [],
});

export const taskListsLoadingAtom = atom<boolean>({
  key: "taskListsLoading",
  default: false,
});

export const taskListsErrorAtom = atom<string | null>({
  key: "taskListsError",
  default: null,
});

// =============================================================================
// View State
// =============================================================================

export const viewStateAtom = atom<ViewState>({
  key: "viewState",
  default: {
    view: "all",
    activeListId: undefined,
    activeListIndex: -1,
  },
});

export type TaskViewMode = "board" | "list" | "calendar" | "eisenhower";

export const taskViewModeAtom = atom<TaskViewMode>({
  key: "taskViewMode",
  default: "board",
});

// =============================================================================
// UI State
// =============================================================================

export const toastAtom = atom<ToastMessage | null>({
  key: "toast",
  default: null,
});

export const isOnlineAtom = atom<boolean>({
  key: "isOnline",
  default: typeof navigator !== "undefined" ? navigator.onLine : true,
});

export const appReadyAtom = atom<boolean>({
  key: "appReady",
  default: false,
});

// =============================================================================
// Starred Task IDs (local)
// =============================================================================

export const starredTaskIdsAtom = atom<Set<string>>({
  key: "starredTaskIds",
  default: new Set(),
});

export const aiCopilotOpenAtom = atom<boolean>({
  key: "aiCopilotOpen",
  default: false,
});

export const settingsOpenAtom = atom<boolean>({
  key: "settingsOpen",
  default: false,
});

// =============================================================================
// Language / i18n State
// =============================================================================

export const appLanguageAtom = atom<string>({
  key: "appLanguage",
  default: typeof window !== "undefined" ? (localStorage.getItem("google_tasks_app_language") || "en") : "en",
});
