/**
 * Settings Service
 * 
 * Manages app-wide settings stored in Tauri's local store.
 */

import { Store } from 'tauri-plugin-store-api';

const SETTINGS_STORE = '.settings.dat';
const SETTINGS_KEY = 'appSettings';

export type TimeFormatPreference = '12h' | '24h' | 'both';

export interface AppSettings {
  /** Hour of day to send due date notifications (0-23) */
  notificationHour: number;
  /** Preferred time format style (12h, 24h, or both) */
  timeFormat?: TimeFormatPreference;
}

const DEFAULT_SETTINGS: AppSettings = {
  notificationHour: 9, // 9 AM
  timeFormat: 'both',
};

let store: Store | null = null;
let cachedSettings: AppSettings | null = null;

/**
 * Initialize the settings store
 */
async function getStore(): Promise<Store> {
  if (!store) {
    store = new Store(SETTINGS_STORE);
  }
  return store;
}

/**
 * Load settings from store
 */
export async function loadSettings(): Promise<AppSettings> {
  if (cachedSettings) {
    return cachedSettings;
  }

  try {
    const s = await getStore();
    const saved = await s.get<AppSettings>(SETTINGS_KEY);
    cachedSettings = saved ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS;
    return cachedSettings;
  } catch (error) {
    console.error('Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings to store
 */
export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  try {
    const current = await loadSettings();
    const updated = { ...current, ...settings };
    
    const s = await getStore();
    await s.set(SETTINGS_KEY, updated);
    await s.save();
    
    cachedSettings = updated;
    console.debug('Settings saved:', updated);
    return updated;
  } catch (error) {
    console.error('Failed to save settings:', error);
    throw error;
  }
}

/**
 * Get the notification hour (convenience function)
 */
export async function getNotificationHour(): Promise<number> {
  const settings = await loadSettings();
  return settings.notificationHour;
}

/**
 * Set the notification hour
 */
export async function setNotificationHour(hour: number): Promise<void> {
  if (hour < 0 || hour > 23) {
    throw new Error('Hour must be between 0 and 23');
  }
  await saveSettings({ notificationHour: hour });
}

/**
 * Format hour for display (e.g., 9 -> "9:00 AM", 14 -> "2:00 PM", localized Arabic "9:00 ص", or 24h "09:00")
 */
export function formatHour(
  hour: number,
  language: string = 'en',
  formatStyle: TimeFormatPreference = 'both'
): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const time24 = `${pad(hour)}:00`;
  const isAr = language === 'ar';
  
  // Localized AM/PM
  const period = hour >= 12 ? (isAr ? 'م' : 'PM') : (isAr ? 'ص' : 'AM');
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const time12 = `${displayHour}:00 ${period}`;

  if (formatStyle === '24h') {
    return time24;
  }
  if (formatStyle === '12h') {
    return time12;
  }
  // 'both' combined style: "09:00 (9:00 ص)" or "09:00 (9:00 AM)"
  return `${time24} (${time12})`;
}

/**
 * Get available notification hours for dropdown
 */
export function getNotificationHourOptions(
  language: string = 'en',
  formatStyle: TimeFormatPreference = 'both'
): { value: number; label: string }[] {
  const options = [];
  for (let h = 0; h < 24; h++) {
    options.push({
      value: h,
      label: formatHour(h, language, formatStyle),
    });
  }
  return options;
}
