/**
 * AI Service Type Definitions
 * 
 * Supports AI-agnostic providers: Google Gemini, Anthropic Claude,
 * OpenAI-compatible APIs (OpenAI, OpenRouter, Groq), and Local Open-Source (Ollama, LM Studio).
 */

export type AIProviderType =
  | "gemini"
  | "claude"
  | "openai_compatible"
  | "ollama"
  | "lm_studio";

export interface ProviderConfig {
  provider: AIProviderType;
  apiKey: string;
  apiKeys?: string[];
  model: string;
  baseUrl?: string;
  temperature?: number;
  enableThinking?: boolean;
}

export interface AISettings {
  provider: AIProviderType;
  apiKey: string;
  apiKeys?: string[];
  model: string;
  baseUrl?: string;
  temperature?: number;
  enableThinking?: boolean;

  // Backup Agent configuration
  backupEnabled?: boolean;
  backupProvider?: AIProviderType;
  backupApiKey?: string;
  backupApiKeys?: string[];
  backupModel?: string;
  backupBaseUrl?: string;
  backupTemperature?: number;
  backupEnableThinking?: boolean;

  // Saved configs for each provider so keys and models are never lost
  providers?: Partial<Record<AIProviderType, ProviderConfig>>;
}

export type AICopilotActionType =
  | "CREATE_TASK"
  | "CREATE_SUBTASK"
  | "UPDATE_TASK"
  | "DELETE_TASK"
  | "SET_QUADRANT"
  | "CREATE_LIST"
  | "RENAME_LIST"
  | "DELETE_LIST";

export interface AICopilotTaskAction {
  type: "CREATE_TASK";
  title: string;
  notes?: string;
  due?: string; // YYYY-MM-DD
  listName?: string;
  listId?: string;
  quadrant?: "Q1" | "Q2" | "Q3" | "Q4";
}

export interface AICopilotSubtaskAction {
  type: "CREATE_SUBTASK";
  parentTaskTitle?: string;
  parentTaskId?: string;
  listId?: string;
  title: string;
}

export interface AICopilotUpdateTaskAction {
  type: "UPDATE_TASK";
  taskId: string;
  taskTitle?: string;
  newTitle?: string;
  notes?: string;
  due?: string;
  quadrant?: "Q1" | "Q2" | "Q3" | "Q4";
  listId?: string;
}

export interface AICopilotDeleteTaskAction {
  type: "DELETE_TASK";
  taskId: string;
  taskTitle: string;
  listId?: string;
  reason?: string;
}

export interface AICopilotQuadrantAction {
  type: "SET_QUADRANT";
  taskId: string;
  taskTitle: string;
  quadrant: "Q1" | "Q2" | "Q3" | "Q4";
  listId?: string;
}

export interface AICopilotCreateListAction {
  type: "CREATE_LIST";
  title: string;
}

export interface AICopilotRenameListAction {
  type: "RENAME_LIST";
  listId: string;
  currentTitle?: string;
  newTitle: string;
}

export interface AICopilotDeleteListAction {
  type: "DELETE_LIST";
  listId: string;
  listTitle: string;
  reason?: string;
}

export type AICopilotAction =
  | AICopilotTaskAction
  | AICopilotSubtaskAction
  | AICopilotUpdateTaskAction
  | AICopilotDeleteTaskAction
  | AICopilotQuadrantAction
  | AICopilotCreateListAction
  | AICopilotRenameListAction
  | AICopilotDeleteListAction;

export interface AICopilotMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  actions?: AICopilotAction[];
  timestamp: number;
}

export interface TaskContextSnapshot {
  lists: Array<{
    id: string;
    title: string;
    tasks: Array<{
      id: string;
      title: string;
      notes?: string;
      due?: string;
      status: string;
      isStarred: boolean;
      quadrant?: "Q1" | "Q2" | "Q3" | "Q4" | null;
      subtasks?: Array<{ id: string; title: string; status: string }>;
    }>;
  }>;
  activeListId?: string;
  activeListName?: string;
}

export interface AIProviderResponse {
  text: string;
  actions?: AICopilotAction[];
  usedBackup?: boolean;
  usedProvider?: string;
  usedModel?: string;
}

export interface IAIProvider {
  sendMessage(
    messages: AICopilotMessage[],
    context: TaskContextSnapshot,
    settings: AISettings
  ): Promise<AIProviderResponse>;

  testConnection(settings: AISettings): Promise<{ success: boolean; message: string }>;
}
