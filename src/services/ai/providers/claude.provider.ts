/**
 * Anthropic Claude Provider
 * 
 * Direct API client for Anthropic Claude (e.g. claude-3-5-sonnet-20241022).
 */

import {
  IAIProvider,
  AISettings,
  AICopilotMessage,
  TaskContextSnapshot,
  AIProviderResponse,
} from "../types";
import { buildSystemPrompt, extractActionsFromResponse } from "../prompts";

export class ClaudeProvider implements IAIProvider {
  public async sendMessage(
    messages: AICopilotMessage[],
    context: TaskContextSnapshot,
    settings: AISettings
  ): Promise<AIProviderResponse> {
    if (!settings.apiKey) {
      throw new Error("Anthropic Claude API Key is missing. Please set it in Settings -> AI Assistant.");
    }

    const systemPrompt = buildSystemPrompt(context);
    const model = settings.model || "claude-3-5-sonnet-20241022";
    const baseUrl = settings.baseUrl?.trim() || "https://api.anthropic.com";
    const url = `${baseUrl.replace(/\/+$/, "")}/v1/messages`;

    const formattedMessages = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": settings.apiKey.trim(),
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: formattedMessages,
        temperature: settings.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `Claude API error (${response.status}): ${response.statusText}`;
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
    const contentText =
      data.content?.find((c: { type: string; text?: string }) => c.type === "text")?.text || "";

    const { cleanText, actions } = extractActionsFromResponse(contentText);

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
      const model = settings.model || "claude-3-5-sonnet-20241022";
      const baseUrl = settings.baseUrl?.trim() || "https://api.anthropic.com";
      const url = `${baseUrl.replace(/\/+$/, "")}/v1/messages`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": settings.apiKey.trim(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model,
          max_tokens: 10,
          messages: [{ role: "user", content: "ping" }],
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return { success: false, message: `Status ${res.status}: ${text}` };
      }

      return { success: true, message: `Connected to Claude (${model}) successfully!` };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, message };
    }
  }
}
