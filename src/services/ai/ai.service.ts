/**
 * AI Service
 * 
 * Central orchestrator for the AI Copilot.
 * Dispatches requests to the appropriate provider (Gemini, Claude, OpenAI, Ollama, LM Studio).
 */

import {
  IAIProvider,
  AISettings,
  AICopilotMessage,
  TaskContextSnapshot,
  AIProviderResponse,
  AIProviderType,
} from "./types";
import { AISettingsService } from "./ai-settings.service";
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

    const provider = this.getProvider(settings.provider);
    return provider.sendMessage(messages, context, settings);
  }

  public async testConnection(
    settings: AISettings
  ): Promise<{ success: boolean; message: string }> {
    const provider = this.getProvider(settings.provider);
    return provider.testConnection(settings);
  }
}

export const aiService = new AIService();
export * from "./types";
export * from "./ai-settings.service";
