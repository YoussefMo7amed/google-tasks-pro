/**
 * AI Settings Service
 * 
 * Persists and provides default configurations for all supported AI providers.
 */

import { AISettings, AIProviderType, ProviderConfig } from "./types";
export type { AISettings, AIProviderType, ProviderConfig };

const STORAGE_KEY = "google_tasks_ai_settings";

export const ALL_PROVIDERS: AIProviderType[] = [
  "gemini",
  "openai_compatible",
  "claude",
  "ollama",
  "lm_studio",
];

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
  lm_studio: "http://127.0.0.1:1234/v1",
};

export const PROVIDER_LABELS: Record<AIProviderType, string> = {
  gemini: "Google Gemini (Recommended)",
  openai_compatible: "OpenAI / OpenRouter / Groq",
  claude: "Anthropic Claude",
  ollama: "Ollama (Local Open-Source)",
  lm_studio: "LM Studio (Local Open-Source)",
};

export function createDefaultProviderConfigs(): Record<AIProviderType, ProviderConfig> {
  return {
    gemini: {
      provider: "gemini",
      apiKey: "",
      apiKeys: [],
      model: DEFAULT_MODELS.gemini,
      baseUrl: DEFAULT_BASE_URLS.gemini,
      temperature: 0.7,
    },
    openai_compatible: {
      provider: "openai_compatible",
      apiKey: "",
      apiKeys: [],
      model: DEFAULT_MODELS.openai_compatible,
      baseUrl: DEFAULT_BASE_URLS.openai_compatible,
      temperature: 0.7,
    },
    claude: {
      provider: "claude",
      apiKey: "",
      apiKeys: [],
      model: DEFAULT_MODELS.claude,
      baseUrl: DEFAULT_BASE_URLS.claude,
      temperature: 0.7,
    },
    ollama: {
      provider: "ollama",
      apiKey: "",
      apiKeys: [],
      model: DEFAULT_MODELS.ollama,
      baseUrl: DEFAULT_BASE_URLS.ollama,
      temperature: 0.7,
    },
    lm_studio: {
      provider: "lm_studio",
      apiKey: "",
      apiKeys: [],
      model: DEFAULT_MODELS.lm_studio,
      baseUrl: DEFAULT_BASE_URLS.lm_studio,
      temperature: 0.7,
    },
  };
}

const DEFAULT_SETTINGS: AISettings = {
  provider: "gemini",
  apiKey: "",
  apiKeys: [],
  model: DEFAULT_MODELS.gemini,
  baseUrl: DEFAULT_BASE_URLS.gemini,
  temperature: 0.7,
  backupEnabled: false,
  backupProvider: "openai_compatible",
  backupApiKey: "",
  backupApiKeys: [],
  backupModel: DEFAULT_MODELS.openai_compatible,
  backupBaseUrl: DEFAULT_BASE_URLS.openai_compatible,
  backupTemperature: 0.7,
  providers: createDefaultProviderConfigs(),
};

export class AISettingsService {
  public static load(): AISettings {
    try {
      const defaultProviders = createDefaultProviderConfigs();
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return {
          ...DEFAULT_SETTINGS,
          providers: defaultProviders,
        };
      }
      const parsed = JSON.parse(stored);

      // Merge saved providers with defaults
      const providers: Record<AIProviderType, ProviderConfig> = {
        ...defaultProviders,
        ...(parsed.providers || {}),
      };

      // Ensure each provider has complete fields
      ALL_PROVIDERS.forEach((prov) => {
        providers[prov] = {
          ...defaultProviders[prov],
          ...(providers[prov] || {}),
        };
        // Ensure apiKeys array is populated from apiKey
        if (providers[prov].apiKey && (!providers[prov].apiKeys || providers[prov].apiKeys!.length === 0)) {
          providers[prov].apiKeys = [providers[prov].apiKey];
        }
      });

      // Migrate legacy single settings into providers record if missing
      const primaryProv: AIProviderType = parsed.provider || "gemini";
      if (parsed.apiKey && (!providers[primaryProv].apiKey || providers[primaryProv].apiKey === "")) {
        providers[primaryProv].apiKey = parsed.apiKey;
        providers[primaryProv].apiKeys = parsed.apiKeys || [parsed.apiKey];
        if (parsed.model) providers[primaryProv].model = parsed.model;
        if (parsed.baseUrl) providers[primaryProv].baseUrl = parsed.baseUrl;
      }

      if (parsed.backupProvider && parsed.backupApiKey) {
        const bProv: AIProviderType = parsed.backupProvider;
        if (!providers[bProv].apiKey || providers[bProv].apiKey === "") {
          providers[bProv].apiKey = parsed.backupApiKey;
          providers[bProv].apiKeys = parsed.backupApiKeys || [parsed.backupApiKey];
          if (parsed.backupModel) providers[bProv].model = parsed.backupModel;
          if (parsed.backupBaseUrl) providers[bProv].baseUrl = parsed.backupBaseUrl;
        }
      }

      // Auto-migrate deprecated models like gemini-2.0-flash
      if (providers.gemini.model === "gemini-2.0-flash" || providers.gemini.model === "gemini-1.5-flash") {
        providers.gemini.model = "gemini-3.8-flash";
      }

      const activePrimary = providers[primaryProv];
      const backupProv: AIProviderType = parsed.backupProvider || "openai_compatible";
      const activeBackup = providers[backupProv];

      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        provider: primaryProv,
        apiKey: activePrimary.apiKey,
        apiKeys: activePrimary.apiKeys,
        model: activePrimary.model,
        baseUrl: activePrimary.baseUrl,
        temperature: activePrimary.temperature,
        backupEnabled: parsed.backupEnabled ?? false,
        backupProvider: backupProv,
        backupApiKey: activeBackup.apiKey,
        backupApiKeys: activeBackup.apiKeys,
        backupModel: activeBackup.model,
        backupBaseUrl: activeBackup.baseUrl,
        providers,
      };
    } catch (e) {
      console.warn("Failed to load AI settings:", e);
      return {
        ...DEFAULT_SETTINGS,
        providers: createDefaultProviderConfigs(),
      };
    }
  }

  public static save(settings: AISettings): void {
    try {
      const providers = settings.providers || createDefaultProviderConfigs();

      // Ensure current primary provider config is updated
      if (providers[settings.provider]) {
        providers[settings.provider] = {
          ...providers[settings.provider],
          apiKey: settings.apiKey,
          apiKeys: settings.apiKeys && settings.apiKeys.length > 0 ? settings.apiKeys : (settings.apiKey ? [settings.apiKey] : []),
          model: settings.model,
          baseUrl: settings.baseUrl,
          temperature: settings.temperature,
        };
      }

      // Ensure current backup provider config is updated
      if (settings.backupProvider && providers[settings.backupProvider]) {
        providers[settings.backupProvider] = {
          ...providers[settings.backupProvider],
          apiKey: settings.backupApiKey || providers[settings.backupProvider].apiKey || "",
          apiKeys: settings.backupApiKeys && settings.backupApiKeys.length > 0
            ? settings.backupApiKeys
            : (settings.backupApiKey ? [settings.backupApiKey] : providers[settings.backupProvider].apiKeys),
          model: settings.backupModel || providers[settings.backupProvider].model,
          baseUrl: settings.backupBaseUrl || providers[settings.backupProvider].baseUrl,
        };
      }

      settings.providers = providers;
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
      providers: createDefaultProviderConfigs(),
    };
  }
}
