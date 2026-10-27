/**
 * Unified AI HTTP Client
 * 
 * Uses Tauri's native Rust HTTP client when available (bypasses browser CORS completely).
 * Falls back to standard window.fetch in standard browser environments.
 */

import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { isTauri } from "@tauri-apps/api/core";

export interface AIHttpRequestOptions {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface AIHttpResponse<T = any> {
  ok: boolean;
  status: number;
  data: T;
  rawText?: string;
}

export async function aiFetch<T = any>(
  url: string,
  options: AIHttpRequestOptions = {}
): Promise<AIHttpResponse<T>> {
  const method = options.method || "GET";
  const headers = options.headers || {};
  const timeoutMs = (options.timeout ?? 60) * 1000;
  const inTauri = isTauri() || (typeof window !== "undefined" && ("__TAURI_INTERNALS__" in window || "__TAURI__" in window));

  // 1. Try Tauri native HTTP (Rust) to bypass any CORS restrictions
  if (inTauri) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const requestBody = options.body !== undefined && options.body !== null
        ? typeof options.body === "string"
          ? options.body
          : JSON.stringify(options.body)
        : undefined;

      const res = await tauriFetch(url, {
        method,
        headers,
        body: requestBody,
        connectTimeout: timeoutMs,
        signal: controller.signal,
      });

      const rawText = await res.text();
      let parsedData: any = rawText;
      try {
        parsedData = JSON.parse(rawText);
      } catch {
        parsedData = rawText;
      }

      return {
        ok: res.ok,
        status: res.status,
        data: parsedData as T,
        rawText,
      };
    } catch (tauriErr) {
      console.warn("Tauri native HTTP encountered an error, trying window.fetch fallback:", tauriErr);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // 2. Standard web fetch fallback
  const fallbackController = new AbortController();
  const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), timeoutMs);
  try {
    const fetchBody = options.body
      ? typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body)
      : undefined;

    const res = await fetch(url, {
      method,
      headers,
      body: fetchBody,
      signal: fallbackController.signal,
    });

    const rawText = await res.text();
    let parsedData: any = rawText;
    try {
      parsedData = JSON.parse(rawText);
    } catch {
      parsedData = rawText;
    }

    return {
      ok: res.ok,
      status: res.status,
      data: parsedData as T,
      rawText,
    };
  } finally {
    clearTimeout(fallbackTimeoutId);
  }
}
