/**
 * Localized Date Utilities
 * 
 * Provides unified, memory-efficient date formatting across all views and components.
 */

import { I18nService } from "./i18n.service";
import { LanguageCode } from "./types";

export interface FormattedDueDate {
  label: string;
  isOverdue: boolean;
}

export function formatLocalizedDueDate(
  date: string | Date | undefined | null,
  language: string = "en",
  t?: (key: string) => string
): FormattedDueDate | null {
  if (!date) return null;

  const dueDate = typeof date === "string" ? new Date(date) : date;
  if (isNaN(dueDate.getTime())) return null;

  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isOverdue = dueDate < today && dueDate.toDateString() !== today.toDateString();
  const langCode: LanguageCode = language === "ar" ? "ar" : "en";

  let label = "";
  if (dueDate.toDateString() === today.toDateString()) {
    label = t ? t("tasks.today") : I18nService.translate(langCode, "tasks.today");
  } else if (dueDate.toDateString() === tomorrow.toDateString()) {
    label = t ? t("tasks.tomorrow") : I18nService.translate(langCode, "tasks.tomorrow");
  } else {
    const locale = language === "ar" ? "ar-EG" : "en-US";
    label = dueDate.toLocaleDateString(locale, { month: "short", day: "numeric" });
  }

  return { label, isOverdue };
}

export const WEEKDAY_INITIALS: Record<string, string[]> = {
  en: ["S", "M", "T", "W", "T", "F", "S"],
  ar: ["ح", "ن", "ث", "ر", "خ", "ج", "س"],
};

export function getWeekdayInitials(language: string = "en"): string[] {
  return WEEKDAY_INITIALS[language] || WEEKDAY_INITIALS.en;
}

