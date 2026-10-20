export const DEFAULT_CLIENT_ID =
  (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? (process.env.VITE_GOOGLE_CLIENT_ID as string) ?? "") as string;
export const DEFAULT_CLIENT_SECRET =
  (import.meta.env.VITE_GOOGLE_CLIENT_SECRET ?? (process.env.VITE_GOOGLE_CLIENT_SECRET as string) ?? "") as string;

export function getClientId(): string {
  if (typeof window !== "undefined" && window.localStorage) {
    const custom = window.localStorage.getItem("custom_google_client_id");
    if (custom && custom.trim()) return custom.trim();
  }
  return DEFAULT_CLIENT_ID;
}

export function getClientSecret(): string {
  if (typeof window !== "undefined" && window.localStorage) {
    const custom = window.localStorage.getItem("custom_google_client_secret");
    if (custom && custom.trim()) return custom.trim();
  }
  return DEFAULT_CLIENT_SECRET;
}

export function setCustomCredentials(clientId?: string, clientSecret?: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    if (clientId && clientId.trim()) {
      window.localStorage.setItem("custom_google_client_id", clientId.trim());
    } else {
      window.localStorage.removeItem("custom_google_client_id");
    }

    if (clientSecret && clientSecret.trim()) {
      window.localStorage.setItem("custom_google_client_secret", clientSecret.trim());
    } else {
      window.localStorage.removeItem("custom_google_client_secret");
    }
  }
}

// Backwards compatibility
export const CLIENT_ID = getClientId();
export const CLIENT_SECRET = getClientSecret();
