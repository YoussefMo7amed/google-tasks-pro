/**
 * Storage Scope Helper
 * 
 * Provides an isolated namespace identifier for localStorage and file storage.
 * Ensures zero cross-contamination between different Google accounts and Guest mode.
 */

export function getActiveStorageScope(): string {
  if (typeof window === "undefined") return "guest";
  
  // 1. If explicitly in guest mode
  if (localStorage.getItem("is_guest_mode") === "true") {
    return "guest";
  }

  // 2. If a Google account is logged in
  const email = localStorage.getItem("current_user_email");
  if (email && email.trim() !== "") {
    return `user_${email.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "_")}`;
  }

  return "guest";
}
