# AGENTS.md — AI Developer & Agent Guide

> **Welcome, AI Agent / Developer!**  
> This file is the primary orientation and architectural reference for the **Google Tasks Desktop** codebase. Whenever you need to locate files, add features, fix bugs, or understand architectural flows, start here.

---

## 1. Project Overview & Tech Stack

* **Core Framework:** React 18 + TypeScript + Vite
* **Desktop Wrapper:** Tauri v1 (Rust backend, macOS/Windows native integration)
* **UI & Styling:** Material UI (MUI v7) + Emotion
* **State Management:** Recoil (Atoms/Selectors) + Recoil Nexus + Service Layer Singletons
* **Drag & Drop:** `@dnd-kit/core` & `@dnd-kit/sortable`
* **Internationalization:** Custom lightweight i18n system (`en` and `ar` with full RTL/LTR switching)
* **Authentication:** OAuth2 (Google Tasks API via Auth0 / Custom Tauri Token Flow)

---

## 2. Directory Map (Where is what?)

```text
google-task-desktop/
├── AGENTS.md                       # <-- You are here (AI Agent Primary Guide)
├── ARCHITECTURE.md                 # Historic architectural refactoring notes
├── src/
│   ├── main.tsx                    # App root, ThemeProvider, RecoilRoot, Init
│   ├── App.tsx                     # Top-level window frame, header, and auth routing
│   ├── theme.ts                    # STATIC THEME SINGLETONS (Zero memory-leak LTR/RTL themes)
│   ├── components/
│   │   ├── TaskPage.tsx            # Main workspace view router (switches between views)
│   │   ├── ai/                     # AI Copilot modal, chat UI, tools, and actions
│   │   ├── layout/                 # Sidebar, Header, Window controls, Sync badge
│   │   ├── tasks/                  # All Task-related views and cards:
│   │   │   ├── TaskListsContainer.tsx  # Horizontal board view (multi-column lists)
│   │   │   ├── TaskListCard.tsx        # Individual task list column card
│   │   │   ├── TaskListItem.tsx        # Individual task item (checkbox, star, menus)
│   │   │   ├── StarredTasksCard.tsx    # Dedicated card for starred tasks
│   │   │   ├── TrashTasksView.tsx      # Deleted tasks recycle bin & retention timer
│   │   │   ├── UnifiedListView.tsx     # Single consolidated list view
│   │   │   ├── CalendarTasksView.tsx   # Monthly/weekly calendar agenda view
│   │   │   ├── EisenhowerMatrixView.tsx# 4-quadrant urgent/important matrix
│   │   │   ├── AnalyticsView.tsx       # Productivity streaks, completion stats
│   │   │   └── TaskDetailModal.tsx     # Full-screen task details & subtasks editor
│   │   └── ui/                     # Shared dialogs (SettingsDialog, KeyboardShortcutsModal, AddCategoryDialog)
│   ├── hooks/                      # Custom React hooks (Bridge between UI and Services):
│   │   ├── useTasks.ts             # Task CRUD, complete, star, delete, restore, undo/redo
│   │   ├── useTaskLists.ts         # List CRUD, offline-first snapshot loading, background sync
│   │   ├── useTrash.ts             # Reactive hook for trash bin, restore, retention settings
│   │   ├── useUndoRedo.ts          # Reactive undo/redo state and handlers
│   │   ├── useGlobalKeyboardShortcuts.ts # Global shortcuts (Ctrl+Z, Ctrl+Tab, N, ?, etc.)
│   │   └── useServices.ts          # Dependency injection container for Repositories
│   ├── services/                   # Business logic singletons & background workers:
│   │   ├── trash.service.ts        # Deleted tasks store, auto-clean expiration timer
│   │   ├── undo-redo.service.ts    # Undo/Redo stack history engine
│   │   ├── sync-queue.service.ts   # Offline mutation queue (drains when online)
│   │   ├── offline-cache.service.ts# LocalStorage snapshots for instant startup
│   │   ├── notification.service.ts # Tauri native reminder notifications
│   │   ├── settings.service.ts     # User preferences (notification hour, 12h/24h time format)
│   │   └── ai.service.ts           # Multi-provider LLM integrations (Gemini, OpenAI, Ollama, LM Studio)
│   ├── repositories/               # Direct I/O and Google Tasks API callers:
│   │   ├── task.repository.ts      # HTTP calls to Google Tasks API for tasks
│   │   ├── task-list.repository.ts # HTTP calls to Google Tasks API for lists
│   │   └── starred.repository.ts   # Tauri filesystem repository for starred tasks (`starred-tasks.json`)
│   ├── store/                      # Recoil atoms & selectors (`atoms.ts`)
│   ├── i18n/                       # Translation engine:
│   │   ├── index.ts                # useTranslation hook and translation provider
│   │   ├── types.ts                # Strict TypeScript schema for all translation keys
│   │   └── locales/                # `en.ts` (English) and `ar.ts` (Arabic)
│   ├── types/                      # Application and Google API TypeScript definitions:
│   │   ├── app.ts                  # AppTask, AppTaskList, SidebarView, ViewState
│   │   └── google-tasks.ts         # GoogleTask, GoogleTaskList, Google API request/response types
│   └── helpers/                    # Utilities for auth, window management, date formatting
└── src-tauri/                      # Rust backend (Tauri window config, notifications, plugins)
```

---

## 3. Core Architectural Rules (MUST FOLLOW)

### Rule 1: Always Branch Before Implementing
* **Never commit directly to `main` without testing.**
* When implementing a new feature or non-trivial fix:
  1. Create a branch: `git checkout -b feature/<name>` or `fix/<name>`
  2. Implement and test
  3. Verify with `npx tsc --noEmit` and `npm run build`
  4. Commit and merge into `main` (or present to user for confirmation).

### Rule 2: Zero Memory-Leak Theme Singletons
* Material-UI theme creation must **NEVER** happen dynamically inside a component render loop.
* All themes (`darkRtlTheme`, `darkLtrTheme`, `lightRtlTheme`, `lightLtrTheme`) are statically pre-built singletons in [`src/theme.ts`](file:///Users/youssef/Development/projects/google-task-desktop/src/theme.ts).
* Component uses `getStaticTheme(mode, dir)` which returns the static instance with zero allocations.

### Rule 3: Strict Internationalization & RTL
* **Never hardcode user-facing strings in JSX.**
* When adding text:
  1. Add the key and type definition to [`src/i18n/types.ts`](file:///Users/youssef/Development/projects/google-task-desktop/src/i18n/types.ts).
  2. Add the Arabic translation to [`src/i18n/locales/ar.ts`](file:///Users/youssef/Development/projects/google-task-desktop/src/i18n/locales/ar.ts).
  3. Add the English translation to [`src/i18n/locales/en.ts`](file:///Users/youssef/Development/projects/google-task-desktop/src/i18n/locales/en.ts).
  4. Use `const { t, isRtl, language } = useTranslation();`.
  5. Directional layout elements should use `isRtl ? { mr: "auto" } : { ml: "auto" }` or CSS logical properties (`margin-inline-start`, etc.).

### Rule 4: Offline-First Data Flow
* Tasks and Lists are cached in `localStorage` via `offlineCacheService`.
* Mutations made offline are pushed to `syncQueueService` and processed automatically when the network returns (`online` event in `useTaskLists.ts`).
* Deleted tasks are kept in `trashService` so the user can restore them even without network.

### Rule 5: Keep Starred Tasks Reconciled
* Google Tasks API does NOT have a native star endpoint. Starring is stored locally via `starred.repository.ts`.
* Starred counts must **always** count tasks that actually exist in active `taskLists`.
* Orphaned task IDs are cleaned up in the background when `useTaskLists.ts` loads.

---

## 4. Cookbook: "Where Do I Go When I Want To..."

| Task | Files to Edit | Details |
|---|---|---|
| **Add a new Sidebar View / Tab** | `src/types/app.ts`<br>`src/components/layout/Sidebar.tsx`<br>`src/components/TaskPage.tsx`<br>`src/hooks/useGlobalKeyboardShortcuts.ts`<br>`src/i18n/` | 1. Add view name to `SidebarView` in `src/types/app.ts`.<br>2. Add navigation item in `Sidebar.tsx`.<br>3. Render view component in `TaskPage.tsx`.<br>4. Add to `Ctrl+Tab` cycle in `useGlobalKeyboardShortcuts.ts`. |
| **Add a Task Action (Archive, Duplicate, etc.)** | `src/hooks/useTasks.ts`<br>`src/components/tasks/TaskListItem.tsx`<br>`src/services/undo-redo.service.ts` | 1. Implement function in `useTasks.ts`.<br>2. Push undo/redo action to `undoRedoService`.<br>3. Add menu item / button to `TaskListItem.tsx`. |
| **Add a Global Keyboard Shortcut** | `src/hooks/useGlobalKeyboardShortcuts.ts`<br>`src/components/ui/KeyboardShortcutsModal.tsx`<br>`src/i18n/` | 1. Listen for key combination in `useGlobalKeyboardShortcuts.ts`.<br>2. Account for both English and Arabic keyboard layouts.<br>3. Add to cheatsheet modal in `KeyboardShortcutsModal.tsx`. |
| **Modify Trash / Recycle Bin Logic** | `src/services/trash.service.ts`<br>`src/hooks/useTrash.ts`<br>`src/components/tasks/TrashTasksView.tsx` | 1. Logic & retention calculations in `trash.service.ts`.<br>2. Hook bindings in `useTrash.ts`.<br>3. UI controls in `TrashTasksView.tsx`. |
| **Add App Settings or Notification Options** | `src/services/settings.service.ts`<br>`src/components/ui/SettingsDialog.tsx` | 1. Add fields to `AppSettings` in `settings.service.ts`.<br>2. Add inputs / switches to `SettingsDialog.tsx`. |
| **Add / Tune AI Assistant Features** | `src/services/ai.service.ts`<br>`src/components/ai/AICopilotModal.tsx` | 1. Prompts and tools in `ai.service.ts`.<br>2. UI and streaming chat response in `AICopilotModal.tsx`. |

---

## 5. Key Services Reference

### `trashService` ([`src/services/trash.service.ts`](file:///Users/youssef/Development/projects/google-task-desktop/src/services/trash.service.ts))
* **Purpose:** Safely stores deleted tasks locally before permanent removal.
* **Methods:**
  * `moveToTrash(task: AppTask, originalListTitle?: string)`
  * `restoreTask(trashId: string): TrashedTask | null`
  * `permanentDelete(trashId: string): boolean`
  * `emptyTrash(): void`
  * `updateSettings({ retention, customDays })`
  * `cleanExpired(): number` (Runs on startup)
* **Retention options:** `"1d"`, `"3d"`, `"7d"`, `"30d"`, `"custom"`, `"never"`.

### `undoRedoService` ([`src/services/undo-redo.service.ts`](file:///Users/youssef/Development/projects/google-task-desktop/src/services/undo-redo.service.ts))
* **Purpose:** Standard Undo/Redo stack for user actions.
* **Actions covered:** `CREATE_TASK`, `DELETE_TASK`, `TOGGLE_COMPLETE`, `TOGGLE_STAR`, `UPDATE_TASK`.
* **Shortcuts:** `Cmd+Z` / `Ctrl+Z` (Undo), `Cmd+Shift+Z` / `Ctrl+Y` (Redo). Both English and Arabic keycodes supported.

### `syncQueueService` ([`src/services/sync-queue.service.ts`](file:///Users/youssef/Development/projects/google-task-desktop/src/services/sync-queue.service.ts))
* **Purpose:** Queues task operations when offline.
* **Auto-drain:** Emits subscriber events to UI header badge and automatically drains via `drainQueue(taskService)` when connection is restored.

---

## 6. Build & Verification Commands

Always run these commands to verify any changes before committing:

```bash
# 1. Typecheck TypeScript across the entire project
npx tsc --noEmit

# 2. Production Vite build
npm run build
```

---

## 7. Roadmap: Tauri v2 & Mobile (Android APK) Migration
* **Current Core Focus:** Ultra-stable Tauri v1.4 desktop client powering macOS (`.dmg`), Windows (`.exe`, `.msi`), and Linux (`.deb`, `.AppImage`).
* **Planned Milestone:** Migrate to Tauri v2 in an isolated experimental branch (`feature/tauri-v2-migration`).
* **Migration Requirements:**
  1. Migrate plugins from v1 git branches to official v2 crates (`@tauri-apps/plugin-store`, `@tauri-apps/plugin-log`, etc.).
  2. Convert `allowlist` in `tauri.conf.json` to the v2 Capabilities & ACL permission system (`src-tauri/capabilities/`).
  3. Refactor `main.rs` system tray implementation from `SystemTray` to `tauri::tray::TrayIconBuilder`.
  4. Initialize Android Studio toolchain via `tauri android init` to generate mobile `.apk` artifacts.

---

*Updated & Maintained for Google Tasks Desktop.*
