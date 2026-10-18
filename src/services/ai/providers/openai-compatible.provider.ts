/**
 * OpenAI-Compatible Provider
 * 
 * Works with OpenAI, OpenRouter, Groq, and local open-source models (Ollama, LM Studio).
 */

import {
  IAIProvider,
  AISettings,
  AICopilotMessage,
  TaskContextSnapshot,
  AIProviderResponse,
} from "../types";
import { buildSystemPrompt, extractActionsFromResponse } from "../prompts";

export class OpenAICompatibleProvider implements IAIProvider {
  public async sendMessage(
    messages: AICopilotMessage[],
    context: TaskContextSnapshot,
    settings: AISettings
  ): Promise<AIProviderResponse> {
    const isLocal = settings.provider === "ollama" || settings.provider === "lm_studio";
    if (!isLocal && !settings.apiKey) {
      throw new Error(
        `API Key is missing for ${settings.provider}. Please configure it in Settings -> AI Assistant.`
      );
    }

    const systemPrompt = buildSystemPrompt(context);
    const model = settings.model || (isLocal ? "llama3.2" : "gpt-4o-mini");
    const defaultBaseUrl =
      settings.provider === "ollama"
        ? "http://localhost:11434/v1"
        : settings.provider === "lm_studio"
        ? "http://localhost:1234/v1"
        : "https://api.openai.com/v1";

    const baseUrl = (settings.baseUrl?.trim() || defaultBaseUrl).replace(/\/+$/, "");
    const url = `${baseUrl}/chat/completions`;

    const formattedMessages = [
      { role: "system", content: systemPrompt },
      ...messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role,
          content: m.content,
        })),
    ];

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (settings.apiKey?.trim()) {
      headers["Authorization"] = `Bearer ${settings.apiKey.trim()}`;
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: settings.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `API error (${response.status}): ${response.statusText}`;
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
    const contentText = data.choices?.[0]?.message?.content || "";

    const { cleanText, actions } = extractActionsFromResponse(contentText);

    return {
      text: cleanText,
      actions,
    };
  }

  public async testConnection(
    settings: AISettings
  ): Promise<{ success: boolean; message: string }> {
    const isLocal = settings.provider === "ollama" || settings.provider === "lm_studio";
    if (!isLocal && !settings.apiKey) {
      return { success: false, message: "API key is required" };
    }

    try {
      const model = settings.model || (isLocal ? "llama3.2" : "gpt-4o-mini");
      const defaultBaseUrl =
        settings.provider === "ollama"
          ? "http://localhost:11434/v1"
          : settings.provider === "lm_studio"
          ? "http://localhost:1234/v1"
          : "https://api.openai.com/v1";

      const baseUrl = (settings.baseUrl?.trim() || defaultBaseUrl).replace(/\/+$/, "");
      const url = `${baseUrl}/chat/completions`;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (settings.apiKey?.trim()) {
        headers["Authorization"] = `Bearer ${settings.apiKey.trim()}`;
      }

      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        return { success: false, message: `Status ${res.status}: ${text}` };
      }

      return { success: true, message: `Connected to ${settings.provider} (${model}) successfully!` };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, message };
    }
  }
}
