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
  AIProviderType,
} from "../types";
import { buildSystemPrompt, extractActionsFromResponse, sanitizeConversationHistory } from "../prompts";
import { aiFetch } from "../ai-client";

export function getOpenAIBaseUrl(rawBaseUrl?: string, provider: AIProviderType = "openai_compatible"): string {
  const defaultBaseUrl =
    provider === "ollama"
      ? "http://localhost:11434/v1"
      : provider === "lm_studio"
      ? "http://127.0.0.1:1234/v1"
      : "https://api.openai.com/v1";

  let baseUrl = (rawBaseUrl?.trim() || defaultBaseUrl).replace(/\/+$/, "");

  // If the user specified a host without /v1 (e.g. http://127.0.0.1:1234 or http://localhost:11434),
  // automatically append /v1 so that endpoints resolve to /v1/chat/completions and /v1/models!
  if (!baseUrl.endsWith("/v1") && !baseUrl.includes("/v1/") && !baseUrl.includes("/api/")) {
    baseUrl = `${baseUrl}/v1`;
  }

  return baseUrl;
}

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
    const model = settings.model || (isLocal ? "local-model" : "gpt-4o-mini");
    const baseUrl = getOpenAIBaseUrl(settings.baseUrl, settings.provider);
    const url = `${baseUrl}/chat/completions`;

    const sanitizedHistory = sanitizeConversationHistory(messages);
    if (sanitizedHistory.length === 0) {
      sanitizedHistory.push({
        role: "user",
        content: "Hello",
      });
    }

    let formattedMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: systemPrompt },
      ...sanitizedHistory,
    ];

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (settings.apiKey?.trim()) {
      headers["Authorization"] = `Bearer ${settings.apiKey.trim()}`;
    }

    let response = await aiFetch(url, {
      method: "POST",
      headers,
      body: {
        model,
        messages: formattedMessages,
        temperature: settings.temperature ?? 0.7,
      },
    });

    // Fallback: If local model rejected system message or prompt template error, merge system prompt into first user turn
    if (!response.ok && response.rawText && (response.rawText.includes("jinja") || response.rawText.includes("Conversation roles") || response.rawText.includes("system"))) {
      const mergedHistory = sanitizedHistory.map((m, idx) => {
        if (idx === 0) {
          return {
            role: "user",
            content: `[System Instructions]\n${systemPrompt}\n\n[User Request]\n${m.content}`,
          };
        }
        return m;
      });

      response = await aiFetch(url, {
        method: "POST",
        headers,
        body: {
          model,
          messages: mergedHistory,
          temperature: settings.temperature ?? 0.7,
        },
      });
    }

    if (!response.ok) {
      let errorMsg = `API error (${response.status})`;
      if (response.data && typeof response.data === "object" && (response.data as any).error?.message) {
        errorMsg = (response.data as any).error.message;
      } else if (response.rawText) {
        errorMsg = response.rawText;
      }
      throw new Error(errorMsg);
    }

    const data = response.data;
    const contentText = data?.choices?.[0]?.message?.content || "";

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

    const baseUrl = getOpenAIBaseUrl(settings.baseUrl, settings.provider);
    const model = settings.model || (isLocal ? "local-model" : "gpt-4o-mini");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (settings.apiKey?.trim()) {
      headers["Authorization"] = `Bearer ${settings.apiKey.trim()}`;
    }

    try {
      // 1. First attempt: check /models endpoint (instant, avoids running prompt or VRAM crash)
      try {
        const modelsUrl = `${baseUrl}/models`;
        const modelsRes = await aiFetch(modelsUrl, {
          method: "GET",
          headers: settings.apiKey?.trim() ? { Authorization: `Bearer ${settings.apiKey.trim()}` } : {},
        });

        if (modelsRes.ok && modelsRes.data) {
          const modelsData = modelsRes.data;
          const modelList = Array.isArray(modelsData?.data) ? modelsData.data.map((m: any) => m.id) : [];
          const found = modelList.includes(model);
          return {
            success: true,
            message: `Connected to ${settings.provider} successfully! ${found ? `Model '${model}' is loaded and ready.` : `Server is running with ${modelList.length} model(s) available (${modelList.slice(0, 2).join(", ")}).`}`,
          };
        }
      } catch (modelsErr) {
        console.debug("Could not verify via /models endpoint, trying /chat/completions ping...", modelsErr);
      }

      // 2. Second attempt: /chat/completions ping
      const url = `${baseUrl}/chat/completions`;
      const res = await aiFetch(url, {
        method: "POST",
        headers,
        body: {
          model,
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        },
      });

      if (!res.ok) {
        const text = res.rawText || (typeof res.data === "object" ? JSON.stringify(res.data) : String(res.data));
        return { success: false, message: `Status ${res.status}: ${text}` };
      }

      return { success: true, message: `Connected to ${settings.provider} (${model}) successfully!` };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);

      // Helpful guidance for WebKit "Load failed" on local servers
      if (isLocal && (message.includes("Load failed") || message.includes("Failed to fetch"))) {
        return {
          success: false,
          message: `Connection failed (Load failed). Please ensure:\n1. LM Studio Server is running (${baseUrl})\n2. In LM Studio -> "Server Settings" -> turn "Enable CORS" ON\n3. Base URL is set to: ${baseUrl}`,
        };
      }

      return { success: false, message };
    }
  }
}
