/**
 * AI Model Catalog
 * 
 * Curated list of popular, capable, and efficient sub-models for each AI provider,
 * complete with capability tags (Recommended, Fast, Reasoning, Pro, Quota Saver).
 * Also supports custom-typed fine-tuned or newly released models.
 */

import { AIProviderType } from "./types";

export type ModelTag = "recommended" | "fast" | "reasoning" | "pro" | "quota_saver" | "custom";

export interface ModelOption {
  id: string;
  label: string;
  tag: ModelTag;
  contextWindow?: string;
  descriptionKey?: string;
}

export const PROVIDER_MODELS: Record<AIProviderType, ModelOption[]> = {
  gemini: [
    {
      id: "gemini-2.5-flash",
      label: "Gemini 2.5 Flash",
      tag: "recommended",
      contextWindow: "1M tokens",
      descriptionKey: "ai.models.gemini25FlashDesc",
    },
    {
      id: "gemini-2.0-flash",
      label: "Gemini 2.0 Flash",
      tag: "fast",
      contextWindow: "1M tokens",
      descriptionKey: "ai.models.gemini20FlashDesc",
    },
    {
      id: "gemini-2.0-flash-lite",
      label: "Gemini 2.0 Flash-Lite",
      tag: "quota_saver",
      contextWindow: "1M tokens",
      descriptionKey: "ai.models.gemini20FlashLiteDesc",
    },
    {
      id: "gemini-1.5-flash",
      label: "Gemini 1.5 Flash",
      tag: "fast",
      contextWindow: "1M tokens",
      descriptionKey: "ai.models.gemini15FlashDesc",
    },
    {
      id: "gemini-1.5-pro",
      label: "Gemini 1.5 Pro",
      tag: "reasoning",
      contextWindow: "2M tokens",
      descriptionKey: "ai.models.gemini15ProDesc",
    },
  ],

  claude: [
    {
      id: "claude-3-5-sonnet-20241022",
      label: "Claude 3.5 Sonnet",
      tag: "recommended",
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
      tag: "pro",
      contextWindow: "200k tokens",
      descriptionKey: "ai.models.claudeOpusDesc",
    },
  ],

  openai_compatible: [
    {
      id: "gpt-4o-mini",
      label: "GPT-4o Mini",
      tag: "recommended",
      contextWindow: "128k tokens",
      descriptionKey: "ai.models.gpt4oMiniDesc",
    },
    {
      id: "gpt-4o",
      label: "GPT-4o",
      tag: "pro",
      contextWindow: "128k tokens",
      descriptionKey: "ai.models.gpt4oDesc",
    },
    {
      id: "o3-mini",
      label: "o3-mini",
      tag: "reasoning",
      contextWindow: "200k tokens",
      descriptionKey: "ai.models.o3MiniDesc",
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
      id: "llama3.2",
      label: "Llama 3.2",
      tag: "recommended",
      descriptionKey: "ai.models.llama32Desc",
    },
    {
      id: "llama3.1",
      label: "Llama 3.1",
      tag: "pro",
      descriptionKey: "ai.models.llama31Desc",
    },
    {
      id: "qwen2.5",
      label: "Qwen 2.5",
      tag: "reasoning",
      descriptionKey: "ai.models.qwen25Desc",
    },
    {
      id: "deepseek-r1",
      label: "DeepSeek R1",
      tag: "reasoning",
      descriptionKey: "ai.models.deepseekR1Desc",
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
      tag: "recommended",
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
