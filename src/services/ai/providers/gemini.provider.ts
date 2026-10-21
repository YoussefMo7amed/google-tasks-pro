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
import { buildSystemPrompt, extractActionsFromResponse, sanitizeConversationHistory } from "../prompts";
import { aiFetch } from "../ai-client";

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

    const sanitizedHistory = sanitizeConversationHistory(messages);
    if (sanitizedHistory.length === 0) {
      sanitizedHistory.push({
        role: "user",
        content: "Hello",
      });
    }

    // Map conversation history
    const contents = sanitizedHistory.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const generationConfig: Record<string, unknown> = {
      temperature: settings.temperature ?? 0.7,
    };

    // If user disabled thinking, explicitly set thinkingBudget to 0 for instant responses
    if (settings.enableThinking === false) {
      generationConfig.thinkingConfig = {
        thinkingBudget: 0,
      };
    }

    const requestBody = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig,
    };

    const response = await aiFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: requestBody,
    });

    if (!response.ok) {
      let errorMsg = `Gemini API error (${response.status})`;
      if (response.data?.error?.message) {
        errorMsg = response.data.error.message;
      } else if (response.rawText) {
        errorMsg = response.rawText;
      }
      throw new Error(errorMsg);
    }

    const data = response.data;
    const candidateText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response received from Gemini.";

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

      const testGenerationConfig: Record<string, unknown> = {
        maxOutputTokens: 5,
      };
      if (settings.enableThinking === false) {
        testGenerationConfig.thinkingConfig = {
          thinkingBudget: 0,
        };
      }

      const res = await aiFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: {
          contents: [{ role: "user", parts: [{ text: "ping" }] }],
          generationConfig: testGenerationConfig,
        },
      });

      if (!res.ok) {
        const text = res.rawText || JSON.stringify(res.data);
        return { success: false, message: `Status ${res.status}: ${text}` };
      }

      return { success: true, message: `Connected to Gemini (${model}) successfully!` };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, message };
    }
  }
}
