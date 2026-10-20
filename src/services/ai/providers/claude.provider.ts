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
import { buildSystemPrompt, extractActionsFromResponse, sanitizeConversationHistory } from "../prompts";
import { aiFetch } from "../ai-client";

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

    const sanitizedHistory = sanitizeConversationHistory(messages);
    if (sanitizedHistory.length === 0) {
      sanitizedHistory.push({
        role: "user",
        content: "Hello",
      });
    }

    const response = await aiFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": settings.apiKey.trim(),
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: {
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: sanitizedHistory,
        temperature: settings.temperature ?? 0.7,
      },
    });

    if (!response.ok) {
      let errorMsg = `Claude API error (${response.status})`;
      if (response.data?.error?.message) {
        errorMsg = response.data.error.message;
      } else if (response.rawText) {
        errorMsg = response.rawText;
      }
      throw new Error(errorMsg);
    }

    const data = response.data;
    const contentText =
      data?.content?.find((c: { type: string; text?: string }) => c.type === "text")?.text || "";

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

      const res = await aiFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": settings.apiKey.trim(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: {
          model,
          max_tokens: 10,
          messages: [{ role: "user", content: "ping" }],
        },
      });

      if (!res.ok) {
        const text = res.rawText || JSON.stringify(res.data);
        return { success: false, message: `Status ${res.status}: ${text}` };
      }

      return { success: true, message: `Connected to Claude (${model}) successfully!` };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, message };
    }
  }
}
