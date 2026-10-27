# Tauri v2 + Android Migration — Updated Plan

Based on the earlier review, **re-verified against the code** (`Cargo.toml`, `tauri.conf.json`, `main.rs`, `notifications.rs`, `filehelper.rs`, and all `@tauri-apps/*` imports in `src/`).

## 1. Corrections to the earlier review

| Claim in review | Verdict | Reality |
|---|---|---|
| Remove `tauri-plugin-http` (frontend uses axios) | ❌ **Wrong** | [`ai-client.ts`](file:///Users/youssef/Development/projects/google-task-desktop/src/services/ai/ai-client.ts) imports `fetch as tauriFetch` from `@tauri-apps/api/http` (Ollama / LM Studio bypass CORS). **Keep `tauri-plugin-http`** with scoped URLs. Google API calls (axios) are fine. Verify `tauriFetch` call sites, then migrate to `@tauri-apps/plugin-http` `fetch` (`Body`/`ResponseType` are gone). |
| `isMobile` from `@tauri-apps/api/platform` | ❌ | Removed in v2. Use `@tauri-apps/plugin-os` (`platform()`), or `navigator.userAgent` as a fallback. |
| Use `BaseDirectory.AppLocalData` instead of `AppData` | ❌ | Not needed. On desktop, keep paths as-is so existing user data is found. Android maps both to the app's private dir. |
| Foreground service for notifications | ⚠️ Wrong tool | A foreground service shows a permanent notification and is overkill. Use **OS-scheduled local notifications** (`tauri-plugin-notification` `.schedule(Schedule::At(..))`, backed by AlarmManager). Needs `SCHEDULE_EXACT_ALARM`/`POST_NOTIFICATIONS`. Re-schedule after reboot. |
| Custom scheme `com.googleusercontent.apps.CLIENT_ID:/redirect` for OAuth | ⚠️ Incomplete | Only valid with a separate **Android/iOS-type OAuth client + PKCE (no client secret)**. Desktop keeps the current client. `tauri-plugin-oauth` (localhost server) is **desktop-only**. |
| Store `.dat` → v2 format "untested" | ✅ Real risk | Do a spike with real v1 files. Fallback: one-time Rust/JS migration that reads the old file and rewrites it. |
| `tauri-specta` "`Commands::collect()`" | ⚠️ | v2 needs `tauri-specta` **2.0 RC** with `collect_commands!` + `Builder`. It's still RC, so a hand-written typed `commands.ts` is an acceptable fallback (only 6 commands). |
| Notification scheduler + tray need rewrite/guards | ✅ | Confirmed (`tauri::api::notification` at `notifications.rs:84`; `SystemTray` in `main.rs`). |
| `filehelper.rs` uses `tauri::api::path` | ✅ | Confirmed. It uses `lazy_static` with no app handle. In v2 it needs `app.path().app_local_data_dir()`, so refactor to resolve paths in `setup()`. The desktop path stays the same (`local_data_dir/codad5.google.task`) if the identifier is unchanged. |
| Capabilities FS scope too broad | ✅ | Current allowlist already uses `$APPDATA/**` etc. Replicate it as a scoped permission; don't widen it. |

## 2. Additional gaps found

- `tauri.conf.json` has `"withGlobalTauri": true` and `"csp": null`. Decide whether to keep both (v2 renames this to `app.withGlobalTauri`).
- `tauri-plugin-context-menu` has no confirmed v2 release. Check it, or replace it with a native menu (`@tauri-apps/api/menu`) or a web-based menu.
- `cocoa` crate: keep behind `#[cfg(target_os="macos")]`. Try `set_focus()` first; keep NSApp activation only if needed.
- Window close → hide, tray, single-instance, and global shortcuts must be **desktop-only** (`#[cfg(desktop)]`). On Android, "hide on close" must be disabled.
- `AddTaskFab.tsx` and `useGlobalKeyboardShortcuts.ts` use `globalShortcut`. Guard them by platform.
- `listen_global("oauth://url")` becomes `app.listen("oauth://url")` (v2 event API).
- `package.json` uses `tauri-plugin-store-api` and `tauri-plugin-log-api` from GitHub `#v1`. Replace them with `@tauri-apps/plugin-store`, `@tauri-apps/plugin-log` and `@tauri-apps/plugin-fs`, `-dialog`, `-notification`, `-shell`, `-os`, `-global-shortcut`, `-deep-link`.
- Store `Store.load()` is async in v2 (`DBStores.ts`, `settings.service.ts`).
- Secrets: `client_secret_*.json` is gitignored. It must **never** be bundled into the Android APK. Use PKCE with an Android client ID.
- Update [`AGENTS.md`](file:///Users/youssef/Development/projects/google-task-desktop/AGENTS.md) §1, §6 and §7 and the README after migration. Any new user-facing strings (e.g. Android permission prompts) must go through i18n (Rule 3).
- Per the repo rules, work on branch `feature/tauri-v2-migration`. Verify with `npx tsc --noEmit` and `npm run build`.

## 3. Phases

### Phase 0 — Spike (1 week, **go/no-go**)
Do on the branch, in this order. The riskiest items come first:
1. `npm create tauri-app`-style scratch run of `tauri android init` to confirm the toolchain (JDK, SDK, NDK, Rust targets).
2. **Local notifications**: scheduled notification firing with the app closed on a real device (Android 13/14: permissions, exact alarms, reboot persistence).
3. **OAuth on Android**: Android-type client, PKCE, `tauri-plugin-deep-link`, token exchange, and refresh.
4. **Store migration**: load real v1 `.settings.dat`, `.auth.dat`, `.task.dat` and `starred-tasks-*.json` in v2.
5. `tauriFetch` to a LAN Ollama from Android (cleartext HTTP config).

Exit criteria: all five work, or you've documented a fallback for each.

### Phase 1 — Desktop Rust backend (1.5–2 wks)
- `Cargo.toml`: tauri 2, plugins (`log`, `store`, `fs`, `dialog`, `notification`, `shell`, `http`, `os`, `deep-link`; desktop-only `single-instance`, `global-shortcut`, `oauth`), tray feature. Remove the v1 allowlist feature flags.
- `tauri.conf.json` to v2 schema (`app.windows`, `bundle`, no `allowlist`, no `systemTray`); add `src-tauri/capabilities/*.json` with scoped fs and http.
- `main.rs`: `TrayIconBuilder` + menu (desktop-only), `on_window_event` guard, `Emitter`/`Listener` traits, `get_webview_window`.
- `notifications.rs`: replace with `tauri_plugin_notification::NotificationExt`. Keep the 5s polling thread on desktop only (use `tauri::async_runtime::spawn`). On Android, schedule through the plugin and keep the same `schedule`/`cancel` commands as a platform-switched facade.
- `filehelper.rs`/`auth.rs`: path resolution via `app.path()`; remove `lazy_static` globals.
- Specta: move to the v2 RC, or hand-write `commands.ts`.

### Phase 2 — Frontend (1.5 wks)
- Swap the imports listed above (`api/tauri` → `api/core`, `api/window` → `webviewWindow`, fs/dialog/notification/shell/http to plugins).
- OAuth: desktop uses `start()`/`cancel()` from `@tauri-apps/plugin-oauth` (replaces `invoke('plugin:oauth|…')` in `invoker.ts` and `auth.ts`). Android uses deep-link + PKCE, with a platform branch in `PortManager`/`openAuthWindow`.
- Platform guards for shortcuts, tray-related settings (e.g. "minimize to background"), and window helpers.
- Store API async changes; keep `save()` calls.

### Phase 3 — Desktop QA (1.5 wks)
macOS, Windows and Linux matrix: login/refresh, offline queue drain, notifications (including closed-to-tray), tray, shortcuts, trash/undo, AI providers (Gemini, OpenAI, Ollama, LM Studio), RTL/LTR, **upgrade from an existing v1 install with data intact**.

### Phase 4 — Android (2–3 wks)
- `tauri android init`, applicationId/identifier, icons, adaptive icon, permissions (`POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `INTERNET`), deep-link intent filter, cleartext config for local AI.
- Mobile UX: responsive layout, touch drag-and-drop, hide desktop-only settings, back-button handling, safe areas, RTL.
- Test on API 24, 28, 33/34 plus one low-end device. Check WebView compatibility (MUI v7/Emotion); add polyfills only if needed.

### Phase 5 — CI/CD & release (1 wk)
GitHub Actions matrix for desktop and Android (signed AAB/APK, keystore in secrets), updater decision (currently `active: false`), and release notes.

## 4. Timeline

| Phase | Estimate (full-time) |
|---|---|
| 0 Spike | 1 wk |
| 1 Rust | 1.5–2 wks |
| 2 Frontend | 1.5 wks |
| 3 Desktop QA | 1.5 wks |
| 4 Android | 2–3 wks |
| 5 CI/CD | 1 wk |
| **Total** | **~8–10 wks full-time** (the review's 4–6 wks only holds if Android is cut or the spike goes cleanly) |

Practical option: **ship desktop v2 first (Phases 1–3, ~5 wks)**, then do Android as a separate milestone.

## 5. Ranked risks

1. Android OAuth (separate client type, PKCE, deep link). High.
2. Reminder delivery on Android (exact alarms, reboot, OEM battery killers). High.
3. Store v1→v2 data loss on upgrade. Medium–High. Mitigation: back up files before the first v2 launch.
4. Plugin availability: `context-menu`, `specta` v2 RC. Medium.
5. `tauriFetch` removal breaking local AI providers. Medium.
6. WebView/UI on mobile (drag-and-drop, layout). Medium.
