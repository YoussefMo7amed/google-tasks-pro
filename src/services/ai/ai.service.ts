/**
 * AI Service
 * 
 * Central orchestrator for the AI Copilot.
 * Dispatches requests to the appropriate provider (Gemini, Claude, OpenAI, Ollama, LM Studio).
 * Supports saved configurations per provider, multiple API keys, and automatic failover to Backup Agent.
 */

import {
  IAIProvider,
  AISettings,
  AICopilotMessage,
  TaskContextSnapshot,
  AIProviderResponse,
  AIProviderType,
} from "./types";
import { AISettingsService, DEFAULT_MODELS, DEFAULT_BASE_URLS } from "./ai-settings.service";
import { GeminiProvider } from "./providers/gemini.provider";
import { ClaudeProvider } from "./providers/claude.provider";
import { OpenAICompatibleProvider } from "./providers/openai-compatible.provider";

class AIService {
  private geminiProvider = new GeminiProvider();
  private claudeProvider = new ClaudeProvider();
  private openAIProvider = new OpenAICompatibleProvider();

  private getProvider(type: AIProviderType): IAIProvider {
    switch (type) {
      case "gemini":
        return this.geminiProvider;
      case "claude":
        return this.claudeProvider;
      case "openai_compatible":
      case "ollama":
      case "lm_studio":
        return this.openAIProvider;
      default:
        return this.geminiProvider;
    }
  }

  public async sendMessage(
    messages: AICopilotMessage[],
    context: TaskContextSnapshot,
    overrideSettings?: Partial<AISettings>
  ): Promise<AIProviderResponse> {
    const settings = {
      ...AISettingsService.load(),
      ...overrideSettings,
    };

    const primaryType = settings.provider || "gemini";
    const primaryConfig = settings.providers?.[primaryType] || {
      provider: primaryType,
      apiKey: settings.apiKey || "",
      apiKeys: settings.apiKeys || (settings.apiKey ? [settings.apiKey] : []),
      model: settings.model || DEFAULT_MODELS[primaryType],
      baseUrl: settings.baseUrl || DEFAULT_BASE_URLS[primaryType],
      temperature: settings.temperature ?? 0.7,
    };

    const isLocal = primaryType === "ollama" || primaryType === "lm_studio";
    const rawKeys = primaryConfig.apiKeys && primaryConfig.apiKeys.length > 0
      ? primaryConfig.apiKeys
      : (primaryConfig.apiKey ? [primaryConfig.apiKey] : []);
    const primaryKeys = isLocal ? [""] : rawKeys.filter((k) => k && k.trim().length > 0);

    let lastPrimaryError: Error | null = null;

    // 1. Try Primary AI Provider with available keys (Failover across saved keys)
    if (primaryKeys.length > 0) {
      for (let i = 0; i < primaryKeys.length; i++) {
        const key = primaryKeys[i];
        const currentSettings: AISettings = {
          ...settings,
          provider: primaryType,
          apiKey: key,
          model: primaryConfig.model || DEFAULT_MODELS[primaryType],
          baseUrl: primaryConfig.baseUrl || DEFAULT_BASE_URLS[primaryType],
          temperature: primaryConfig.temperature ?? 0.7,
        };

        try {
          const provider = this.getProvider(primaryType);
          const res = await provider.sendMessage(messages, context, currentSettings);
          return {
            ...res,
            usedBackup: false,
            usedProvider: primaryType,
            usedModel: currentSettings.model,
          };
        } catch (err: any) {
          lastPrimaryError = err instanceof Error ? err : new Error(String(err));
          console.warn(
            `Primary AI attempt with key ${i + 1}/${primaryKeys.length} failed:`,
            lastPrimaryError.message
          );
        }
      }
    } else {
      lastPrimaryError = new Error(
        `No API key configured for primary provider (${primaryType}). Please set it in Settings -> AI Assistant.`
      );
    }

    // 2. If Primary Provider failed and Backup Agent is enabled, failover to Backup Agent
    if (settings.backupEnabled) {
      const backupProviderType = settings.backupProvider || "openai_compatible";
      const backupConfig = settings.providers?.[backupProviderType] || {
        provider: backupProviderType,
        apiKey: settings.backupApiKey || "",
        apiKeys: settings.backupApiKeys || (settings.backupApiKey ? [settings.backupApiKey] : []),
        model: settings.backupModel || DEFAULT_MODELS[backupProviderType],
        baseUrl: settings.backupBaseUrl || DEFAULT_BASE_URLS[backupProviderType],
        temperature: settings.backupTemperature ?? 0.7,
      };

      const isLocalBackup = backupProviderType === "ollama" || backupProviderType === "lm_studio";
      const rawBackupKeys = backupConfig.apiKeys && backupConfig.apiKeys.length > 0
        ? backupConfig.apiKeys
        : (backupConfig.apiKey ? [backupConfig.apiKey] : []);
      const backupKeys = isLocalBackup ? [""] : rawBackupKeys.filter((k) => k && k.trim().length > 0);

      if (backupKeys.length > 0) {
        console.info("Primary AI provider failed. Failing over to Backup AI Agent...");
        let lastBackupError: Error | null = null;

        for (let j = 0; j < backupKeys.length; j++) {
          const bKey = backupKeys[j];
          const backupSettings: AISettings = {
            ...settings,
            provider: backupProviderType,
            apiKey: bKey,
            model: backupConfig.model || DEFAULT_MODELS[backupProviderType],
            baseUrl: backupConfig.baseUrl || DEFAULT_BASE_URLS[backupProviderType],
            temperature: backupConfig.temperature ?? 0.7,
          };

          try {
            const backupProvider = this.getProvider(backupProviderType);
            const res = await backupProvider.sendMessage(messages, context, backupSettings);
            return {
              ...res,
              usedBackup: true,
              usedProvider: backupProviderType,
              usedModel: backupSettings.model,
            };
          } catch (bErr: any) {
            lastBackupError = bErr instanceof Error ? bErr : new Error(String(bErr));
            console.warn(
              `Backup AI attempt with key ${j + 1}/${backupKeys.length} failed:`,
              lastBackupError.message
            );
          }
        }

        throw new Error(
          `Primary and Backup AI both failed.\nPrimary error: ${lastPrimaryError?.message}\nBackup error: ${lastBackupError?.message}`
        );
      }
    }

    throw lastPrimaryError || new Error("Failed to contact AI service.");
  }

  public async testConnection(
    settings: AISettings
  ): Promise<{ success: boolean; message: string }> {
    const provider = this.getProvider(settings.provider);
    return provider.testConnection(settings);
  }

  public async testProvider(
    providerType: AIProviderType,
    config: { apiKey?: string; model?: string; baseUrl?: string; temperature?: number }
  ): Promise<{ success: boolean; message: string }> {
    const provider = this.getProvider(providerType);
    const settings: AISettings = {
      provider: providerType,
      apiKey: config.apiKey || "",
      model: config.model || DEFAULT_MODELS[providerType],
      baseUrl: config.baseUrl || DEFAULT_BASE_URLS[providerType],
      temperature: config.temperature ?? 0.7,
    };
    return provider.testConnection(settings);
  }

  public async testBackupConnection(
    settings: AISettings
  ): Promise<{ success: boolean; message: string }> {
    const backupProviderType = settings.backupProvider || "openai_compatible";
    const backupConfig = settings.providers?.[backupProviderType] || {
      provider: backupProviderType,
      apiKey: settings.backupApiKey || "",
      model: settings.backupModel || DEFAULT_MODELS[backupProviderType],
      baseUrl: settings.backupBaseUrl || DEFAULT_BASE_URLS[backupProviderType],
      temperature: settings.backupTemperature ?? 0.7,
    };
    return this.testProvider(backupProviderType, backupConfig);
  }
}

export const aiService = new AIService();
export * from "./types";
export * from "./ai-settings.service";
