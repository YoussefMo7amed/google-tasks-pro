import { platform as osPlatform } from '@tauri-apps/plugin-os';

/**
 * Platform helper using @tauri-apps/plugin-os.
 * Detects whether the app is currently running on a mobile OS (Android/iOS)
 * or a desktop OS (macOS/Windows/Linux).
 */

export type AppPlatform = 'android' | 'ios' | 'macos' | 'windows' | 'linux' | 'unknown';

export function isTauri(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as any).__TAURI_INTERNALS__ || (window as any).__TAURI__);
}

export function getPlatform(): AppPlatform {
  try {
    if (typeof window !== 'undefined' && (window as any).__TAURI_OS_PLUGIN_INTERNALS__?.platform) {
      const p = osPlatform();
      if (p === 'android' || p === 'ios' || p === 'macos' || p === 'windows' || p === 'linux') {
        return p;
      }
    }
  } catch {
    // Fallback below
  }

  // Fallback for standard browser / test environment
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent.toLowerCase();
    if (/android/.test(ua)) return 'android';
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (/macintosh|mac os x/.test(ua)) return 'macos';
    if (/windows/.test(ua)) return 'windows';
    if (/linux/.test(ua)) return 'linux';
  }

  return 'unknown';
}

export function isMobile(): boolean {
  const p = getPlatform();
  return p === 'android' || p === 'ios';
}

export function isDesktop(): boolean {
  return !isMobile();
}
