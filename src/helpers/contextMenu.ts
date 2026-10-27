/**
 * Context Menu Wrapper
 * 
 * tauri-plugin-context-menu does not have a v2-compatible release (its npm package
 * depends on Tauri v1 @tauri-apps/api: ^1.5.0).
 * 
 * This wrapper provides a safe no-op on Tauri v2 to prevent build failures and runtime
 * crashes until an official v2 plugin or native context menu API is integrated.
 */

export interface MenuItem {
  label: string;
  disabled?: boolean;
  event?: () => void;
  [key: string]: any;
}

export interface ShowMenuOptions {
  items: MenuItem[];
  [key: string]: any;
}

export async function showMenu(options: ShowMenuOptions): Promise<void> {
  // Safe no-op for Tauri v2
  if (process.env.NODE_ENV === 'development') {
    console.debug('[contextMenu] Context menu requested with options:', options);
  }
}
