/**
 * AI Model Catalog
 * 
 * Curated list of popular, capable, and efficient sub-models for each AI provider,
 * complete with objective capability characteristics (Thinking support, Deep reasoning, Fast without thinking).
 * Also supports custom-typed fine-tuned or newly released models.
 */

import { AIProviderType } from "./types";

export type ModelTag = "thinking" | "deep_thinking" | "no_thinking" | "fast" | "custom";

export interface ModelOption {
  id: string;
  label: string;
  tag: ModelTag;
  contextWindow?: string;
  descriptionKey?: string;
}

export const MODEL_TAG_KEYS: Record<ModelTag, "thinking" | "deepThinking" | "noThinking" | "fast" | "custom"> = {
  thinking: "thinking",
  deep_thinking: "deepThinking",
  no_thinking: "noThinking",
  fast: "fast",
  custom: "custom",
};

export const PROVIDER_MODELS: Record<AIProviderType, ModelOption[]> = {
  gemini: [
    {
      id: "gemini-3.8-flash",
      label: "Gemini 3.8 Flash",
      tag: "thinking",
      contextWindow: "1M tokens",
      descriptionKey: "ai.models.gemini38FlashDesc",
    },
    {
      id: "gemini-3.5-flash",
      label: "Gemini 3.5 Flash",
      tag: "thinking",
      contextWindow: "1M tokens",
      descriptionKey: "ai.models.gemini35FlashDesc",
    },
    {
      id: "gemini-3.1-pro-preview",
      label: "Gemini 3.1 Pro",
      tag: "deep_thinking",
      contextWindow: "1M tokens",
      descriptionKey: "ai.models.gemini31ProDesc",
    },
    {
      id: "gemini-3.1-flash-lite",
      label: "Gemini 3.1 Flash-Lite",
      tag: "fast",
      contextWindow: "1M tokens",
      descriptionKey: "ai.models.gemini31FlashLiteDesc",
    },
    {
      id: "gemini-flash-latest",
      label: "Gemini Flash (Latest)",
      tag: "thinking",
      contextWindow: "1M tokens",
      descriptionKey: "ai.models.geminiFlashLatestDesc",
    },
    {
      id: "gemini-2.5-flash",
      label: "Gemini 2.5 Flash",
      tag: "thinking",
      contextWindow: "1M tokens",
      descriptionKey: "ai.models.gemini25FlashDesc",
    },
    {
      id: "gemini-2.5-pro",
      label: "Gemini 2.5 Pro",
      tag: "deep_thinking",
      contextWindow: "1M tokens",
      descriptionKey: "ai.models.gemini25ProDesc",
    },
  ],

  claude: [
    {
      id: "claude-3-7-sonnet-20250219",
      label: "Claude 3.7 Sonnet",
      tag: "thinking",
      contextWindow: "200k tokens",
      descriptionKey: "ai.models.claude37SonnetDesc",
    },
    {
      id: "claude-3-5-sonnet-20241022",
      label: "Claude 3.5 Sonnet",
      tag: "no_thinking",
      contextWindow: "200k tokens",
      descriptionKey: "ai.models.claudeSonnetDesc",
    },
    {
      id: "claude-3-5-haiku-20241022",
      label: "Claude 3.5 Haiku",
      tag: "fast",
      contextWindow: "200k tokens",
      descriptionKey: "ai.models.claudeHaikuDesc",
    },
    {
      id: "claude-3-opus-20240229",
      label: "Claude 3 Opus",
      tag: "deep_thinking",
      contextWindow: "200k tokens",
      descriptionKey: "ai.models.claudeOpusDesc",
    },
  ],

  openai_compatible: [
    {
      id: "o3-mini",
      label: "o3-mini",
      tag: "thinking",
      contextWindow: "200k tokens",
      descriptionKey: "ai.models.o3MiniDesc",
    },
    {
      id: "o1",
      label: "o1",
      tag: "deep_thinking",
      contextWindow: "200k tokens",
      descriptionKey: "ai.models.o1Desc",
    },
    {
      id: "gpt-4o-mini",
      label: "GPT-4o Mini",
      tag: "fast",
      contextWindow: "128k tokens",
      descriptionKey: "ai.models.gpt4oMiniDesc",
    },
    {
      id: "gpt-4o",
      label: "GPT-4o",
      tag: "no_thinking",
      contextWindow: "128k tokens",
      descriptionKey: "ai.models.gpt4oDesc",
    },
    {
      id: "llama-3.3-70b-versatile",
      label: "Llama 3.3 70B (Groq)",
      tag: "fast",
      contextWindow: "128k tokens",
      descriptionKey: "ai.models.llama70bGroqDesc",
    },
  ],

  ollama: [
    {
      id: "deepseek-r1",
      label: "DeepSeek R1",
      tag: "thinking",
      descriptionKey: "ai.models.deepseekR1Desc",
    },
    {
      id: "llama3.2",
      label: "Llama 3.2",
      tag: "fast",
      descriptionKey: "ai.models.llama32Desc",
    },
    {
      id: "llama3.1",
      label: "Llama 3.1",
      tag: "no_thinking",
      descriptionKey: "ai.models.llama31Desc",
    },
    {
      id: "qwen2.5",
      label: "Qwen 2.5",
      tag: "no_thinking",
      descriptionKey: "ai.models.qwen25Desc",
    },
    {
      id: "mistral",
      label: "Mistral 7B",
      tag: "fast",
      descriptionKey: "ai.models.mistralDesc",
    },
  ],

  lm_studio: [
    {
      id: "local-model",
      label: "Loaded Model (Auto)",
      tag: "no_thinking",
      descriptionKey: "ai.models.lmStudioAutoDesc",
    },
  ],
};

/**
 * Returns all preset models for a provider.
 */
export function getProviderModels(provider: AIProviderType): ModelOption[] {
  return PROVIDER_MODELS[provider] || [];
}

/**
 * Retrieves a ModelOption by ID. If not found in the preset catalog,
 * dynamically generates a safe fallback so Material-UI Select never encounters
 * an out-of-range value.
 */
export function getModelOption(provider: AIProviderType, modelId: string): ModelOption {
  const models = getProviderModels(provider);
  const found = models.find((m) => m.id === modelId);
  if (found) return found;

  return {
    id: modelId,
    label: modelId,
    tag: "custom",
  };
}
