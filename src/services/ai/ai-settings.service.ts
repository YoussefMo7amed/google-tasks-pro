/**
 * AI Settings Service
 * 
 * Persists and provides default configurations for all supported AI providers.
 */

import { AISettings, AIProviderType } from "./types";
export type { AISettings, AIProviderType };

const STORAGE_KEY = "google_tasks_ai_settings";

export const DEFAULT_MODELS: Record<AIProviderType, string> = {
  gemini: "gemini-3.8-flash",
  claude: "claude-3-5-sonnet-20241022",
  openai_compatible: "gpt-4o-mini",
  ollama: "llama3.2",
  lm_studio: "local-model",
};

export const DEFAULT_BASE_URLS: Record<AIProviderType, string> = {
  gemini: "https://generativelanguage.googleapis.com",
  claude: "https://api.anthropic.com",
  openai_compatible: "https://api.openai.com/v1",
  ollama: "http://localhost:11434/v1",
  lm_studio: "http://localhost:1234/v1",
};

export const PROVIDER_LABELS: Record<AIProviderType, string> = {
  gemini: "Google Gemini (Recommended)",
  claude: "Anthropic Claude",
  openai_compatible: "OpenAI / OpenRouter / Groq",
  ollama: "Ollama (Local Open-Source)",
  lm_studio: "LM Studio (Local Open-Source)",
};

const DEFAULT_SETTINGS: AISettings = {
  provider: "gemini",
  apiKey: "",
  model: DEFAULT_MODELS.gemini,
  baseUrl: DEFAULT_BASE_URLS.gemini,
  temperature: 0.7,
};

export class AISettingsService {
  public static load(): AISettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return { ...DEFAULT_SETTINGS };
      const parsed = JSON.parse(stored);
      // Auto-migrate deprecated models like gemini-2.0-flash
      if (parsed.provider === "gemini" && (!parsed.model || parsed.model === "gemini-2.0-flash" || parsed.model === "gemini-1.5-flash")) {
        parsed.model = "gemini-3.8-flash";
      }
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
      };
    } catch (e) {
      console.warn("Failed to load AI settings:", e);
      return { ...DEFAULT_SETTINGS };
    }
  }

  public static save(settings: AISettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save AI settings:", e);
    }
  }

  public static getDefaultSettingsForProvider(provider: AIProviderType): AISettings {
    return {
      provider,
      apiKey: "",
      model: DEFAULT_MODELS[provider],
      baseUrl: DEFAULT_BASE_URLS[provider],
      temperature: 0.7,
    };
  }
}
