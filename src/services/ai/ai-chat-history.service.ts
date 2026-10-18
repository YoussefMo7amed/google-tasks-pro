/**
 * AI Chat History Service
 * 
 * Manages persistent multi-chat sessions in localStorage.
 * Allows creating new chats, switching between conversations,
 * and resuming earlier planning sessions.
 */

import { AICopilotMessage } from "./types";

export interface AIChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: AICopilotMessage[];
}

const STORAGE_KEY = "google_tasks_ai_chat_sessions_v1";
const ACTIVE_SESSION_ID_KEY = "google_tasks_ai_active_session_id";

const INITIAL_WELCOME_MESSAGE: AICopilotMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "مرحباً! أنا مساعدك الذكي للمهام (AI Copilot). يمكنني مساعدتك في تخطيط أهدافك، تفكيكها إلى مهام فرعية، وترتيبها تلقائياً وفق مصفوفة أيزنهاور. كيف يمكنني مساعدتك اليوم؟",
  timestamp: Date.now(),
};

export class AIChatHistoryService {
  /**
   * Load all saved sessions
   */
  public static loadSessions(): AIChatSession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => b.updatedAt - a.updatedAt);
      }
      return [];
    } catch (e) {
      console.warn("Failed to load AI chat sessions:", e);
      return [];
    }
  }

  /**
   * Save all sessions
   */
  public static saveSessions(sessions: AIChatSession[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (e) {
      console.error("Failed to save AI chat sessions:", e);
    }
  }

  /**
   * Get active session ID
   */
  public static getActiveSessionId(): string | null {
    try {
      return localStorage.getItem(ACTIVE_SESSION_ID_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Set active session ID
   */
  public static setActiveSessionId(id: string): void {
    try {
      localStorage.setItem(ACTIVE_SESSION_ID_KEY, id);
    } catch (e) {
      console.error("Failed to set active AI session ID:", e);
    }
  }

  /**
   * Create a new session
   */
  public static createSession(title = "محادثة جديدة"): AIChatSession {
    const session: AIChatSession = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [{ ...INITIAL_WELCOME_MESSAGE, id: `welcome_${Date.now()}`, timestamp: Date.now() }],
    };

    const sessions = this.loadSessions();
    sessions.unshift(session);
    this.saveSessions(sessions);
    this.setActiveSessionId(session.id);
    return session;
  }

  /**
   * Update session messages and optionally auto-generate title from first user query
   */
  public static updateSession(id: string, messages: AICopilotMessage[]): void {
    const sessions = this.loadSessions();
    const index = sessions.findIndex((s) => s.id === id);

    if (index !== -1) {
      const session = sessions[index];
      session.messages = messages;
      session.updatedAt = Date.now();

      // If title is default, extract from first user message
      if (session.title === "محادثة جديدة" || session.title.startsWith("محادثة جديدة")) {
        const firstUserMsg = messages.find((m) => m.role === "user");
        if (firstUserMsg) {
          session.title =
            firstUserMsg.content.slice(0, 32).trim() +
            (firstUserMsg.content.length > 32 ? "..." : "");
        }
      }

      // Move to top of list
      sessions.splice(index, 1);
      sessions.unshift(session);
      this.saveSessions(sessions);
    }
  }

  /**
   * Delete a session
   */
  public static deleteSession(id: string): AIChatSession[] {
    const sessions = this.loadSessions().filter((s) => s.id !== id);
    this.saveSessions(sessions);
    if (this.getActiveSessionId() === id) {
      if (sessions.length > 0) {
        this.setActiveSessionId(sessions[0].id);
      } else {
        localStorage.removeItem(ACTIVE_SESSION_ID_KEY);
      }
    }
    return sessions;
  }
}
