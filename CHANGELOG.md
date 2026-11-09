# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2026-11-09

### 🚀 Unified Date/Status Filtering, Compact Toolbar, and Smarter Task Organization

### Added
- **Unified Date & Status Filtering Across All Tabs**:
  - Filter tasks by due date: **All Dates**, **Today**, **This Week** (locale-aware: Sat–Fri in RTL, Sun–Sat in LTR), and **This Month**.
  - Filter tasks by completion status: **Pending**, **Overdue**, **Completed**, and **All**.
  - Synchronized reactive state (`taskFilterAtom`) across Board (الأعمدة), List (القائمة), and Eisenhower (أيزنهاور) views.
- **Ultra-Compact Single-Line Toolbar & Filter Popover**:
  - Single-line search bar saving >100px of vertical screen real estate on mobile and desktop.
  - Dedicated `TuneRounded` filter config button opening a sleek popover with all date, status, and sort controls.
  - Active indicator badge on the button and removable quick-dismiss pills only when non-default filters are active.
- **Collapsible Lists & Groups in Unified List View**:
  - Smooth animated accordion collapse/expand for individual lists with persistent state saved in `localStorage`.
  - Global Expand/Collapse All toggle button in the toolbar.
- **Overdue Task Highlighting**:
  - Highlighting overdue tasks with error-red due date badges across all views.
  - Automatic expansion of completed tasks section when the "Completed" filter is chosen.
- **Subtask Context Headers in Eisenhower Matrix**:
  - Replaced dangling subtasks with clear parent context headers (`↳ subtask of: [Parent Title] [Quadrant Badge]`).
  - Automatic quadrant inheritance for untagged subtasks from their parent tasks.
- **AI Copilot Message Recovery & Error Handling**:
  - Interactive **Retry** button for failed AI chat responses.
  - Direct quick link to AI settings dialog upon API key errors or quota limits.

### Fixed
- **AI Settings Persistence**: Decoupled AI model selection and API keys persistence immediately to the local encrypted vault (`CryptoVaultService`) with `localStorage` resilience, ensuring settings are never lost on reload or modal reopen.
- **AI Copilot Copy Button**: Relocated copy icon to the message footer for clean LLM chat ergonomics.
- **Strict Internationalization (Zero Hardcoded Strings)**: Full dictionary synchronization across English and Arabic in `types.ts`, `en.ts`, `ar.ts`, and `template.json`.
- **Browser Preview Fallback**: Graceful fallback and user-friendly notice when running outside of the Tauri runtime in a standard browser.

---

## [2.1.0] - 2026-11-01

### 📱 Official Android Mobile Support & Tauri v2 Engine
- Multi-target Universal Android APK (`arm64-v8a` + `armeabi-v7a`).
- Native Tauri v2 migration across desktop and mobile platforms.
- Deep-link OAuth redirect receiver (`googletaskspro://oauth/callback`).
- Mobile bottom navigation bar (`MobileBottomNav.tsx`) with safe-area insets.
- Automated GitHub Actions CI/CD release workflow for multi-platform binaries.

---

## [1.0.0] - 2026-01-19

### 🎉 First Major Release

Complete rewrite of the application with modern architecture, new features, and improved UX.

### Added

- **Architecture Rewrite**: Layered architecture (API Client → Repository → Service → Hooks → Components)
- **Recoil State Management**: Minimal, UI-only state with proper separation
- **Starred Tasks**: Star important tasks and view them in dedicated "Starred" section
- **Inline Task Editing**: Click any task to edit title, notes, and due date in place
- **Drag-and-Drop Reordering**: Reorder tasks within a list using drag handles
- **Subtask Support**: Create and manage subtasks with proper parent-child display
- **Task Due Date Notifications**: OS notifications at 9 AM on task due dates
- **Collapsible Sidebar**: Hide/show sidebar with list visibility toggles  
- **Multi-Account Support**: Sign out and sign in with a different Google account
- **Splash Screen**: Animated loading screen with pulsing logo
- **Comprehensive Documentation**: ARCHITECTURE.md explaining the codebase

### Changed

- **UI Framework**: Migrated from Chakra UI to Material-UI (MUI)
- **Type Safety**: Strong TypeScript types throughout (AppTask, GoogleTask, etc.)
- **Simplified Due Dates**: Date-only support (Google Tasks API limitation)

### Fixed

- Task list rename now works correctly (added ID to PUT request body)
- Sign out experience properly clears cached credentials
- Proper type handling between Google API types and app types

### Known Limitations

- **Due times not supported**: Google Tasks API only stores dates, not times. Notifications trigger at 9 AM on the due date.
- **Offline mode**: Not yet implemented (planned for future release)

---

## [0.0.9] - 2024-04-02

### Previous Release

- Basic Google Tasks functionality
- Login/logout support
- Create, delete, complete tasks

---

## Future Plans

- [ ] Global keyboard shortcuts
- [ ] Offline support with sync
- [ ] Recurring tasks
- [ ] Dark mode themes
