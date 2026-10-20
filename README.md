<div align="center">

# 🚀 Google Tasks Desktop

**A powerful, modern, offline-first desktop client for Google Tasks with AI Copilot, Eisenhower Matrix, Calendar, Recycle Bin, and bilingual Arabic/English support.**

Built with **Tauri (Rust)** • **React 18** • **TypeScript** • **Material UI (MUI v7)** • **Recoil**

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/codad5/google-task-desktop/releases)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-green.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-1.4-orange.svg)](https://tauri.app)
[![i18n](https://img.shields.io/badge/i18n-English%20%7C%20العربية-purple.svg)](src/i18n/)

![Screenshot](screenshot.png)

</div>

---

## ✨ Features Overview

### 🌐 Full Internationalization & Native RTL (English & العربية)
* **True Dual-Language Support:** Seamlessly toggle between **English** and **Arabic (العربية)** anytime without reloading.
* **Pixel-Perfect RTL & LTR:** Intelligent directional mirroring for layouts, icons, typography, and alignments.
* **Zero Memory-Leak Themes:** Statically compiled Material UI theme singletons for both light and dark modes in both directions.

### 🗑️ Smart Recycle Bin & Auto-Clean Retention Timer (Trash)
* **Accidental Delete Protection:** Deleted tasks are safely kept in the local recycle bin with their original list details and notes intact.
* **One-Click Cloud Restore:** Restores any trashed task back to Google Tasks servers and syncs instantly across your devices.
* **Configurable Auto-Clean Timer:** Automatically purges expired tasks:
  * 1 Day (`خلال يوم واحد`)
  * 3 Days / 7 Days / 30 Days
  * Custom Days (`مخصوص`)
  * Never (`أبدًا` — keep until manually emptied)
* **Permanent Deletion & Empty Trash:** One-click confirmation to permanently wipe the bin.

### ↩️ Robust Undo / Redo Engine
* **Full Action Stack:** Undo and Redo support for task creation, deletion, completion, starring, and edits.
* **Cross-Platform Shortcuts:** `Cmd+Z` / `Ctrl+Z` (Undo), `Cmd+Shift+Z` / `Ctrl+Y` (Redo).
* **Bilingual Action Toasts:** Instant feedback showing exactly what action was undone or redone in both English and Arabic.

### 🤖 Built-in AI Copilot (Multi-Provider LLM)
* **Supported AI Engines:** Google Gemini, OpenAI, Ollama (Local), and LM Studio (Local).
* **Multi-Key Management:** Store multiple API keys per provider.
* **Failover Resilience:** Configure **Primary** and **Backup** AI agents with one-click swapping and automatic fallback if quota is exceeded.
* **Context-Aware Assistance:** Ask questions about your tasks, break complex goals into subtasks, organize schedules, and summarize workload.

### 📊 5 Specialized Productivity View Modes
1. **Board View (Multi-Column):** Kanban-style horizontal scrolling columns for all your Google Task lists.
2. **Unified List View:** Single consolidated feed of all your tasks across all lists with quick filtering.
3. **Calendar Agenda View:** Monthly and weekly agenda overview with due-date scheduling.
4. **Eisenhower Matrix:** Automatic 4-quadrant prioritization (Urgent & Important, Urgent & Not Important, etc.).
5. **Analytics & Streaks View:** Visualize completed tasks, productivity rates, and daily completion streaks.

### 💾 Offline-First Architecture & Sync Queue
* **Instant Startup:** Immediate snapshot loading from local cache with zero initial wait time.
* **Offline Mutation Queue:** Create, edit, star, or delete tasks without internet; changes automatically queue and drain to Google Tasks upon reconnecting.
* **Live Sync Status Badge:** Visual indicator displaying pending changes and live sync status.

### ⌨️ Global Keyboard Shortcuts & Cheatsheet
* **Cheatsheet Modal:** Press `?` (or `؟` in Arabic layout) anytime to view the shortcut cheatsheet.
* **Quick Add:** Press `N` or `C` for a new task, `L` for a new list.
* **Tab Cycling:** `Ctrl + Tab` and `Ctrl + Shift + Tab` to smoothly cycle between sidebar views (All, Starred, Eisenhower, Analytics, Trash, Lists).
* **Direct Views:** `1` (Board), `2` (List), `3` (Calendar), `4` (Eisenhower).

---

## 🛠️ Tech Stack & Architecture

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 18, TypeScript, Vite | Modern component-driven reactive UI |
| **Desktop Shell** | Tauri v1 (Rust) | Ultra-lightweight native wrapper (<15MB RAM) |
| **UI & Theming** | Material UI (MUI v7), Emotion | Static theme singletons for zero allocations |
| **State Management** | Recoil + Service Layer Singletons | Clean separation of business logic and UI state |
| **Drag & Drop** | `@dnd-kit/core` & `@dnd-kit/sortable` | Smooth task reordering and list manipulation |
| **Storage & Sync** | Tauri Filesystem + LocalStorage | Offline snapshots, sync queues, and local bins |
| **API Integration** | Google Tasks REST API | OAuth2 token handling, multi-account support |

---

## 📥 Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (v18 or later)
* [Rust](https://www.rust-lang.org/tools/install) (latest stable)
* npm / yarn / pnpm

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/<your-username>/google-task-desktop.git
cd google-task-desktop

# 2. Install dependencies
npm install

# 3. Start development server with Tauri desktop window
npm run launch:dev
```

### Production Build

```bash
# Typecheck TypeScript
npx tsc --noEmit

# Build production bundle
npm run build

# Package native desktop application (macOS .dmg / Windows .msi)
npm run build:app
```

---

## ⚙️ Google Cloud OAuth Configuration

To connect with your personal Google account:
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project and enable the **Google Tasks API**.
3. Configure the **OAuth Consent Screen** (External or Internal).
4. Create an **OAuth 2.0 Client ID** choosing **Desktop application**.
5. Create a `.env` file in the root directory:
   ```env
   VITE_GOOGLE_CLIENT_ID=your_client_id_here
   VITE_GOOGLE_CLIENT_SECRET=your_client_secret_here
   ```

---

## 📖 Developer & Agent Documentation

* [AGENTS.md](./AGENTS.md) — Primary orientation and developer guide for AI coding assistants and contributors.
* [ARCHITECTURE.md](./ARCHITECTURE.md) — Historic architectural notes and refactoring journey.

---

## 👥 Authors & Credits

### 🚀 Maintainer & Lead Developer (v2.0+)
* **[Youssef Mohamed](https://github.com/YoussefMo7amed)**
  * **Full Arabic Internationalization & Native RTL:** Complete dual-language engine (`ar` & `en`), zero memory-leak theme singletons, and layout mirroring.
  * **Smart Recycle Bin (Trash):** Accidental delete protection, configurable auto-clean retention timer (1d, 3d, 7d, 30d, custom, never), and 1-click Google Cloud restore.
  * **Robust Undo / Redo System:** Full stack history (`Cmd+Z`, `Cmd+Shift+Z` / `Ctrl+Y`) with localized notifications for task creation, deletion, completion, starring, and updates.
  * **Multi-Provider AI Copilot:** Native integration with Google Gemini, OpenAI, Ollama, and LM Studio featuring multi-key management and Primary/Backup auto-fallback.
  * **5 Advanced Productivity Views:** Horizontal Kanban Board, Unified List, Calendar Agenda View, Eisenhower Matrix (4-quadrant), and Analytics & Streaks.
  * **Global Keyboard Shortcuts & Cheatsheet:** Interactive shortcuts modal (`?` / `؟`), sidebar tab switching (`Ctrl+Tab`), fast view switching (`1`-`4`), quick task (`N`), and list (`L`).
  * **Offline-First Resilience:** Instant local snapshot startup and offline mutation queue with auto-drain on reconnect.

### 💡 Original Author (v1.0)
* **[codad5 (Chukwuemeka Okoye)](https://github.com/codad5/google-task-desktop)**
  * Original concept and foundational Tauri desktop client and Google Tasks API integration.

---

## 📄 License

This project is licensed under the **[GNU General Public License v3 (GPLv3)](./LICENSE)**.
