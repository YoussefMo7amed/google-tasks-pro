/**
 * Localized Date Utilities
 * 
 * Provides unified, memory-efficient date formatting across all views and components.
 */

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

  let label = "";
  if (dueDate.toDateString() === today.toDateString()) {
    label = t ? t("tasks.today") : (language === "ar" ? "اليوم" : "Today");
  } else if (dueDate.toDateString() === tomorrow.toDateString()) {
    label = t ? t("tasks.tomorrow") : (language === "ar" ? "غداً" : "Tomorrow");
  } else {
    const locale = language === "ar" ? "ar-EG" : "en-US";
    label = dueDate.toLocaleDateString(locale, { month: "short", day: "numeric" });
  }

  return { label, isOverdue };
}
