/**
 * Google Gemini Provider
 * 
 * Direct REST API client for Google Gemini models (e.g. gemini-2.0-flash, gemini-1.5-flash).
 */

import {
  IAIProvider,
  AISettings,
  AICopilotMessage,
  TaskContextSnapshot,
  AIProviderResponse,
} from "../types";
import { buildSystemPrompt, extractActionsFromResponse } from "../prompts";

export class GeminiProvider implements IAIProvider {
  public async sendMessage(
    messages: AICopilotMessage[],
    context: TaskContextSnapshot,
    settings: AISettings
  ): Promise<AIProviderResponse> {
    if (!settings.apiKey) {
      throw new Error("Google Gemini API Key is missing. Please set it in Settings -> AI Assistant.");
    }

    const systemPrompt = buildSystemPrompt(context);
    const model = settings.model || "gemini-3.8-flash";
    const baseUrl = settings.baseUrl?.trim() || "https://generativelanguage.googleapis.com";
    const url = `${baseUrl.replace(/\/+$/, "")}/v1beta/models/${model}:generateContent?key=${settings.apiKey.trim()}`;

    // Map conversation history
    const contents = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const requestBody = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: settings.temperature ?? 0.7,
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `Gemini API error (${response.status}): ${response.statusText}`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMsg = errorJson.error.message;
        }
      } catch {
        // fallback
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();
    const candidateText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received from Gemini.";

    const { cleanText, actions } = extractActionsFromResponse(candidateText);

    return {
      text: cleanText,
      actions,
    };
  }

  public async testConnection(
    settings: AISettings
  ): Promise<{ success: boolean; message: string }> {
    if (!settings.apiKey) {
      return { success: false, message: "API key is required" };
    }

    try {
      const model = settings.model || "gemini-3.8-flash";
      const baseUrl = settings.baseUrl?.trim() || "https://generativelanguage.googleapis.com";
      const url = `${baseUrl.replace(/\/+$/, "")}/v1beta/models/${model}:generateContent?key=${settings.apiKey.trim()}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: "ping" }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return { success: false, message: `Status ${res.status}: ${text}` };
      }

      return { success: true, message: `Connected to Gemini (${model}) successfully!` };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, message };
    }
  }
}
