/**
 * Unified AI HTTP Client
 * 
 * Uses Tauri's native Rust HTTP client when available (bypasses browser CORS completely).
 * Falls back to standard window.fetch in standard browser environments.
 */

import { fetch as tauriFetch, Body, ResponseType } from "@tauri-apps/api/http";

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
      let tauriBody: Body | undefined = undefined;
      if (options.body !== undefined && options.body !== null) {
        if (typeof options.body === "string") {
          tauriBody = Body.text(options.body);
        } else {
          tauriBody = Body.json(options.body);
        }
      }

      const res = await tauriFetch<string>(url, {
        method,
        headers,
        body: tauriBody,
        responseType: ResponseType.Text,
        timeout: options.timeout ?? 60,
      });

      let parsedData: any = res.data;
      if (typeof res.data === "string") {
        try {
          parsedData = JSON.parse(res.data);
        } catch {
          parsedData = res.data;
        }
      }

      return {
        ok: res.ok,
        status: res.status,
        data: parsedData as T,
        rawText: typeof res.data === "string" ? res.data : JSON.stringify(res.data),
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
