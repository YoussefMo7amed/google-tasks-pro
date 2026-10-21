/**
 * AI Error Formatter
 * 
 * Parses raw provider errors (including Google API JSON error payloads)
 * into friendly, clean, localized messages instead of exposing raw JSON stacktraces.
 */

export interface ParsedAIError {
  status?: number;
  type: "quota_exceeded" | "model_not_found" | "auth_failed" | "capacity_spikes" | "generic";
  retryAfter?: string;
  cleanMessage: string;
}

export function parseAIError(status: number, data?: any, rawText?: string): ParsedAIError {
  let message = "";
  if (data?.error?.message) {
    message = data.error.message;
  } else if (typeof data?.error === "string") {
    message = data.error;
  } else if (rawText) {
    try {
      const parsed = JSON.parse(rawText);
      message = parsed?.error?.message || parsed?.message || rawText;
    } catch {
      // If rawText starts with "Status XXX: {", extract JSON inside
      const jsonStart = rawText.indexOf("{");
      if (jsonStart !== -1) {
        try {
          const parsed = JSON.parse(rawText.slice(jsonStart));
          message = parsed?.error?.message || parsed?.message || rawText;
        } catch {
          message = rawText;
        }
      } else {
        message = rawText;
      }
    }
  }

  // Quota Exceeded (429)
  if (status === 429 || message.toLowerCase().includes("quota") || message.toLowerCase().includes("resource_exhausted")) {
    const retryMatch = message.match(/retry in ([^\.\n]+)/i);
    return {
      status: 429,
      type: "quota_exceeded",
      retryAfter: retryMatch ? retryMatch[1] : undefined,
      cleanMessage: message,
    };
  }

  // Model Not Found / Deprecated (404)
  if (status === 404 || message.toLowerCase().includes("not found") || message.toLowerCase().includes("no longer available")) {
    return {
      status: 404,
      type: "model_not_found",
      cleanMessage: message,
    };
  }

  // Auth / Permissions (401 / 403)
  if (status === 401 || status === 403 || message.toLowerCase().includes("api key") || message.toLowerCase().includes("unauthenticated")) {
    return {
      status,
      type: "auth_failed",
      cleanMessage: message,
    };
  }

  // Capacity / High Demand (503)
  if (status === 503 || message.toLowerCase().includes("overloaded") || message.toLowerCase().includes("capacity")) {
    return {
      status: 503,
      type: "capacity_spikes",
      cleanMessage: message,
    };
  }

  return {
    status,
    type: "generic",
    cleanMessage: message,
  };
}
