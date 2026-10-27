/**
 * Unified AI HTTP Client
 * 
 * Uses Tauri's native Rust HTTP client when available (bypasses browser CORS completely).
 * Falls back to standard window.fetch in standard browser environments.
 */

import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

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
  const isTauri = typeof window !== "undefined" && Boolean((window as any).__TAURI_IPC__ || (window as any).__TAURI__);

  // 1. Try Tauri native HTTP (Rust) to bypass any CORS restrictions
  if (isTauri) {
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
        connectTimeout: (options.timeout ?? 60) * 1000,
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
    }
  }

  // 2. Standard web fetch fallback
  const fetchBody = options.body
    ? typeof options.body === "string"
      ? options.body
      : JSON.stringify(options.body)
    : undefined;

  const res = await fetch(url, {
    method,
    headers,
    body: fetchBody,
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
}
