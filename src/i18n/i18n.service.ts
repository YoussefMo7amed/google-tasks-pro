/**
 * i18n Service
 * 
 * Lightweight service for storing language preference and resolving translation keys.
 */

import { DEFAULT_LANGUAGE, getLanguageDefinition, SUPPORTED_LANGUAGES } from "./locales";
import { LanguageCode, LanguageDirection } from "./types";

const STORAGE_KEY = "google_tasks_app_language";

export class I18nService {
  /**
   * Load preferred language from localStorage
   */
  public static loadLanguage(): LanguageCode {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved && SUPPORTED_LANGUAGES.some((lang) => lang.code === saved)) {
          return saved;
        }
      }
    } catch (e) {
      console.warn("Could not read language from localStorage", e);
    }
    return DEFAULT_LANGUAGE;
  }

  /**
   * Save preferred language to localStorage and update document attributes
   */
  public static saveLanguage(code: LanguageCode): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, code);
      }
      this.applyDocumentDirection(code);
    } catch (e) {
      console.warn("Could not save language to localStorage", e);
    }
  }

  /**
   * Apply html dir and lang attributes
   */
  public static applyDocumentDirection(code: LanguageCode): void {
    if (typeof document === "undefined") return;
    const def = getLanguageDefinition(code);
    document.documentElement.dir = def.direction;
    document.documentElement.lang = def.code;
  }

  /**
   * Get direction of given language code
   */
  public static getDirection(code: LanguageCode): LanguageDirection {
    return getLanguageDefinition(code).direction;
  }

  /**
   * Resolve a dot-separated key (e.g. "navigation.allTasks" or "tasks.today")
   */
  public static translate(
    langCode: LanguageCode,
    keyPath: string,
    params?: Record<string, string | number>
  ): string {
    const def = getLanguageDefinition(langCode);
    const keys = keyPath.split(".");
    let current: any = def.messages;

    for (const k of keys) {
      if (current && typeof current === "object" && k in current) {
        current = current[k];
      } else {
        // Fallback to English if missing in target language
        const fallbackDef = getLanguageDefinition(DEFAULT_LANGUAGE);
        let fallbackVal: any = fallbackDef.messages;
        for (const fk of keys) {
          if (fallbackVal && typeof fallbackVal === "object" && fk in fallbackVal) {
            fallbackVal = fallbackVal[fk];
          } else {
            return keyPath; // Return raw key if not found at all
          }
        }
        current = fallbackVal;
        break;
      }
    }

    if (typeof current !== "string") {
      return keyPath;
    }

    // Interpolate parameters if any e.g. "Hello {name}"
    if (params) {
      return current.replace(/\{(\w+)\}/g, (_, match) => {
        return match in params ? String(params[match]) : `{${match}}`;
      });
    }

    return current;
  }
}
