import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  IconButton,
  Button,
  Chip,
  Paper,
  Divider,
  CircularProgress,
  Tooltip,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Fade,
  Checkbox,
  Alert,
  Portal,
  Menu,
  MenuItem,
  ListItemIcon,
  Switch,
} from "@mui/material";
import {
  Close,
  Send,
  AutoAwesome,
  Tune,
  CalendarToday,
  ContentCopy,
  Check,
  Fullscreen,
  FullscreenExit,
  Remove,
  Add,
  History,
  DeleteOutline,
  ChatBubbleOutline,
  CheckCircleOutline,
  CancelOutlined,
  PlaylistRemove,
  KeyboardArrowDown,
  ShieldOutlined,
  Psychology,
} from "@mui/icons-material";
import { useRecoilValue, useSetRecoilState, useRecoilState } from "recoil";
import { taskListsAtom, viewStateAtom, toastAtom, settingsActiveTabAtom, aiCopilotMinimizedAtom, aiSettingsAtom } from "../../store";
import { useTasks, useTaskLists } from "../../hooks";
import {
  aiService,
  AICopilotMessage,
  AICopilotAction,
  TaskContextSnapshot,
} from "../../services";
import { useTranslation } from "../../i18n";
import {
  AISettingsService,
  getProviderModels,
  getModelOption,
  MODEL_TAG_KEYS,
  modelSupportsThinking,
  parseAIError,
  DEFAULT_MODELS,
  DEFAULT_BASE_URLS,
} from "../../services/ai";
import {
  AIChatHistoryService,
  AIChatSession,
  isDefaultChatTitle,
} from "../../services/ai/ai-chat-history.service";
import { applyQuadrantToTitle, extractQuadrant, cleanTitleFromQuadrant } from "../../services/history.service";
import MarkdownViewer from "../ui/MarkdownViewer";

interface AICopilotModalProps {
  open: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
}

const getQuickPrompts = (t: (key: string, params?: Record<string, string | number>) => string) => [
  {
    icon: "🎯",
    label: t("ai.quickPrompts.classifyEisenhower"),
    prompt: t("ai.quickPromptClassifyText"),
  },
  {
    icon: "🧹",
    label: t("ai.quickPrompts.cleanDuplicates"),
    prompt: t("ai.quickPromptCleanText"),
  },
  {
    icon: "🪄",
    label: t("ai.quickPrompts.breakdownGoal"),
    prompt: t("ai.quickPromptBreakdownText"),
  },
  {
    icon: "⚡",
    label: t("ai.quickPrompts.refineTasks"),
    prompt: t("ai.quickPromptRefineText"),
  },
];

const getQuadrantColors = (t: (key: string, params?: Record<string, string | number>) => string): Record<string, { bg: string; color: string; label: string }> => ({
  Q1: { bg: "#fee2e2", color: "#dc2626", label: t("ai.quadrantQ1") },
  Q2: { bg: "#fef3c7", color: "#d97706", label: t("ai.quadrantQ2") },
  Q3: { bg: "#e0e7ff", color: "#4f46e5", label: t("ai.quadrantQ3") },
  Q4: { bg: "#f3f4f6", color: "#4b5563", label: t("ai.quadrantQ4") },
});

export default function AICopilotModal({
  open,
  onClose,
  onOpenSettings,
}: AICopilotModalProps) {
  const { t, language, isRtl } = useTranslation();
  const quickPrompts = getQuickPrompts(t);
  const quadrantColors = getQuadrantColors(t);
  const taskLists = useRecoilValue(taskListsAtom);
  const viewState = useRecoilValue(viewStateAtom);
  const setToast = useSetRecoilState(toastAtom);
  const setSettingsActiveTab = useSetRecoilState(settingsActiveTabAtom);
  const { createTask, createSubtask, updateTask, deleteTask } = useTasks();
  const { createTaskList, renameTaskList, deleteTaskList } = useTaskLists();

  // Multi-chat sessions state
  const [sessions, setSessions] = useState<AIChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [messages, setMessages] = useState<AICopilotMessage[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Sizing & UI controls
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMinimized, setIsMinimized] = useRecoilState(aiCopilotMinimizedAtom);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Granular action management states
  // Map of messageId -> Set of selected action indices
  const [selectedActionIndices, setSelectedActionIndices] = useState<Record<string, Set<number>>>({});
  // Set of applied action unique keys: `${messageId}_${actionIndex}`
  const [appliedActionKeys, setAppliedActionKeys] = useState<Set<string>>(new Set());
  // Set of dismissed action unique keys: `${messageId}_${actionIndex}`
  const [dismissedActionKeys, setDismissedActionKeys] = useState<Set<string>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentSettings, setCurrentSettings] = useRecoilState(aiSettingsAtom);
  const [modelMenuAnchor, setModelMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    if (!open) {
      setIsMinimized(false);
    }
  }, [open, setIsMinimized]);

  const isLocalProvider = currentSettings.provider === "ollama" || currentSettings.provider === "lm_studio";
  const hasKey = Boolean(currentSettings.apiKey && currentSettings.apiKey.trim().length > 0);
  const isMissingKey = !isLocalProvider && !hasKey;

  const providerDisplayName =
    currentSettings.provider === "gemini"
      ? t("settings.providers.gemini")
      : currentSettings.provider === "claude"
      ? t("settings.providers.claude")
      : currentSettings.provider === "openai_compatible"
      ? t("settings.providers.openaiCompatible")
      : currentSettings.provider === "ollama"
      ? t("settings.providers.ollama")
      : t("settings.providers.lmStudio");

  const activeModelOption = getModelOption(currentSettings.provider, currentSettings.model);
  const providerModels = getProviderModels(currentSettings.provider);

  const handleSelectModel = (modelId: string) => {
    const updated = {
      ...currentSettings,
      model: modelId,
      providers: {
        ...currentSettings.providers,
        [currentSettings.provider]: {
          ...currentSettings.providers?.[currentSettings.provider],
          provider: currentSettings.provider,
          apiKey: currentSettings.apiKey,
          apiKeys: currentSettings.apiKeys,
          baseUrl: currentSettings.baseUrl,
          temperature: currentSettings.temperature,
          model: modelId,
        },
      },
    };
    setCurrentSettings(updated);
    AISettingsService.save(updated);
    setModelMenuAnchor(null);
    setToast({
      title: t("ai.switchModel"),
      body: modelId,
      type: "info",
    });
  };

  const handleQuickSwitchToBackup = () => {
    if (!currentSettings.backupProvider) return;
    const backupProv = currentSettings.backupProvider;
    const backupMod = currentSettings.backupModel || DEFAULT_MODELS[backupProv];
    const bConfig = currentSettings.providers?.[backupProv];
    const oldPrimary = currentSettings.provider;
    const oldPrimaryModel = currentSettings.model;
    const pConfig = currentSettings.providers?.[oldPrimary];

    const updated = {
      ...currentSettings,
      provider: backupProv,
      apiKey: bConfig?.apiKey || (backupProv === oldPrimary ? currentSettings.apiKey : ''),
      apiKeys: bConfig?.apiKeys || (backupProv === oldPrimary ? currentSettings.apiKeys : []),
      model: backupMod,
      baseUrl: bConfig?.baseUrl || DEFAULT_BASE_URLS[backupProv],
      backupProvider: oldPrimary,
      backupApiKey: pConfig?.apiKey || '',
      backupApiKeys: pConfig?.apiKeys || [],
      backupModel: oldPrimaryModel,
      backupBaseUrl: pConfig?.baseUrl || DEFAULT_BASE_URLS[oldPrimary],
    };
    setCurrentSettings(updated);
    AISettingsService.save(updated);
    setModelMenuAnchor(null);
    setToast({
      title: t("ai.switchModel"),
      body: `${backupProv.toUpperCase()} (${backupMod})`,
      type: "info",
    });
  };

  const handleToggleThinking = () => {
    const newThinkingState = currentSettings.enableThinking === false;
    const updated = {
      ...currentSettings,
      enableThinking: newThinkingState,
      providers: {
        ...currentSettings.providers,
        [currentSettings.provider]: {
          ...currentSettings.providers?.[currentSettings.provider],
          provider: currentSettings.provider,
          apiKey: currentSettings.apiKey,
          apiKeys: currentSettings.apiKeys,
          baseUrl: currentSettings.baseUrl,
          temperature: currentSettings.temperature,
          model: currentSettings.model,
          enableThinking: newThinkingState,
        },
      },
    };
    setCurrentSettings(updated);
    AISettingsService.save(updated);
    setToast({
      title: t("ai.enableThinking"),
      body: newThinkingState ? t("ai.modelTags.thinking") : t("ai.modelTags.fast"),
      type: "info",
    });
  };

  const handleOpenAISettings = useCallback(() => {
    setSettingsActiveTab(1);
    onOpenSettings();
  }, [setSettingsActiveTab, onOpenSettings]);

  // Initialize or reload chat sessions when modal opens
  const initializeSessions = useCallback(() => {
    let allSessions = AIChatHistoryService.loadSessions();
    if (allSessions.length === 0) {
      const initial = AIChatHistoryService.createSession(undefined, language);
      allSessions = [initial];
    }

    const savedActiveId = AIChatHistoryService.getActiveSessionId();
    const active =
      allSessions.find((s) => s.id === savedActiveId) || allSessions[0];

    setSessions(allSessions);
    setActiveSessionId(active.id);
    setMessages(active.messages);
  }, [language]);

  useEffect(() => {
    if (open) {
      initializeSessions();
    }
  }, [open, initializeSessions]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Switch to another chat session
  const handleSelectSession = (sessionId: string) => {
    const target = sessions.find((s) => s.id === sessionId);
    if (target) {
      setActiveSessionId(target.id);
      setMessages(target.messages);
      AIChatHistoryService.setActiveSessionId(target.id);
    }
  };

  // Create a brand new chat
  const handleNewChat = () => {
    const newSession = AIChatHistoryService.createSession(undefined, language);
    const reloaded = AIChatHistoryService.loadSessions();
    setSessions(reloaded);
    setActiveSessionId(newSession.id);
    setMessages(newSession.messages);
    setInput("");
  };

  // Delete a chat session
  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    let remaining = AIChatHistoryService.deleteSession(sessionId);
    if (remaining.length === 0) {
      const fresh = AIChatHistoryService.createSession(undefined, language);
      remaining = [fresh];
    }
    setSessions(remaining);
    const newActiveId = AIChatHistoryService.getActiveSessionId() || remaining[0].id;
    const active = remaining.find((s) => s.id === newActiveId) || remaining[0];
    setActiveSessionId(active.id);
    setMessages(active.messages);
  };

  // Copy response message
  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const buildContextSnapshot = (): TaskContextSnapshot => {
    const activeList = taskLists.find((l) => l.id === viewState.activeListId);
    return {
      lists: taskLists.map((l) => ({
        id: l.id,
        title: l.title,
        tasks: (l.tasks || []).map((t) => ({
          id: t.id,
          title: t.title,
          notes: t.notes,
          due: t.due,
          status: t.status,
          isStarred: t.isStarred,
          quadrant: extractQuadrant(t.title),
          subtasks: (t.subtasks || []).map((s) => ({
            id: s.id,
            title: s.title,
            status: s.status,
          })),
        })),
      })),
      activeListId: activeList?.id,
      activeListName: activeList?.title,
    };
  };

  const handleSend = async (userText = input) => {
    const trimmed = userText.trim();
    if (!trimmed || loading) return;

    if (isMissingKey) {
      setToast({
        title: t("ai.apiKeyRequiredTitle"),
        body: t("ai.apiKeyRequiredBody", { provider: providerDisplayName }),
        type: "warning",
      });
      handleOpenAISettings();
      return;
    }

    const userMessage: AICopilotMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      content: trimmed,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    AIChatHistoryService.updateSession(activeSessionId, newMessages);
    setSessions(AIChatHistoryService.loadSessions());

    try {
      const context = buildContextSnapshot();
      const response = await aiService.sendMessage(newMessages, context);

      const backupNotice = response.usedBackup
        ? `\n\n> 🛡️ *${t("ai.answeredByBackup", { model: response.usedModel || response.usedProvider || "" })}*`
        : "";

      const assistantMessage: AICopilotMessage = {
        id: `assistant_${Date.now()}`,
        role: "assistant",
        content: response.text + backupNotice,
        actions:
          response.actions && response.actions.length > 0
            ? response.actions
            : undefined,
        timestamp: Date.now(),
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);

      AIChatHistoryService.updateSession(activeSessionId, finalMessages);
      setSessions(AIChatHistoryService.loadSessions());

      if (isMinimized) {
        setToast({
          title: t("ai.responseReadyTitle"),
          body: t("ai.responseReadyBody"),
          type: "info",
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const parsed = parseAIError(0, null, errMsg);

      let friendlyError = errMsg;
      if (parsed.type === "quota_exceeded") {
        friendlyError = `${t("ai.errors.quotaExceeded")}${parsed.retryAfter ? ` (${parsed.retryAfter})` : ""}`;
      } else if (parsed.type === "model_not_found") {
        friendlyError = t("ai.errors.modelNotFound");
      } else if (parsed.type === "auth_failed") {
        friendlyError = t("ai.errors.authFailed");
      } else if (parsed.cleanMessage) {
        friendlyError = parsed.cleanMessage;
      }

      const isCapacityError =
        parsed.type === "capacity_spikes" ||
        parsed.type === "quota_exceeded" ||
        errMsg.includes("503") ||
        errMsg.includes("429");

      const errorMessage: AICopilotMessage = {
        id: `error_${Date.now()}`,
        role: "assistant",
        content:
          isCapacityError && currentSettings.backupEnabled && currentSettings.backupModel
            ? `⚠️ ${friendlyError}\n\n💡 *${t("ai.highDemandNotice")}*`
            : `⚠️ ${friendlyError}`,
        timestamp: Date.now(),
      };
      const finalMessages = [...newMessages, errorMessage];
      setMessages(finalMessages);
      AIChatHistoryService.updateSession(activeSessionId, finalMessages);
      setSessions(AIChatHistoryService.loadSessions());

      if (isMinimized) {
        setToast({
          title: t("ai.responseReadyTitle"),
          body: t("ai.responseReadyBody"),
          type: "info",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Granular Action Selection Helpers
  const isActionSelected = (msgId: string, index: number): boolean => {
    const key = `${msgId}_${index}`;
    if (appliedActionKeys.has(key) || dismissedActionKeys.has(key)) return false;
    const set = selectedActionIndices[msgId];
    if (!set) return true; // Default: all are selected
    return set.has(index);
  };

  const toggleActionSelect = (msgId: string, index: number, total: number) => {
    setSelectedActionIndices((prev) => {
      const current = prev[msgId]
        ? new Set(prev[msgId])
        : new Set(Array.from({ length: total }, (_, i) => i));

      if (current.has(index)) {
        current.delete(index);
      } else {
        current.add(index);
      }
      return { ...prev, [msgId]: current };
    });
  };

  const toggleSelectAll = (msgId: string, actions: AICopilotAction[]) => {
    const pendingIndices = actions
      .map((_, i) => i)
      .filter((i) => !appliedActionKeys.has(`${msgId}_${i}`) && !dismissedActionKeys.has(`${msgId}_${i}`));

    const currentSelected = selectedActionIndices[msgId] ?? new Set(pendingIndices);
    const areAllSelected = pendingIndices.every((i) => currentSelected.has(i));

    setSelectedActionIndices((prev) => ({
      ...prev,
      [msgId]: areAllSelected ? new Set() : new Set(pendingIndices),
    }));
  };

  // Execute a single action against Google Tasks / Local State
  const executeSingleAction = async (
    action: AICopilotAction,
    createdTaskMap: Map<string, string>,
    fallbackListId: string
  ): Promise<boolean> => {
    try {
      switch (action.type) {
        case "CREATE_TASK": {
          let targetListId = fallbackListId;
          if (action.listName) {
            const found = taskLists.find(
              (l) => l.title.toLowerCase() === action.listName?.toLowerCase()
            );
            if (found) targetListId = found.id;
          }

          let finalTitle = action.title;
          if (action.quadrant) {
            finalTitle = applyQuadrantToTitle(action.title, action.quadrant);
          }

          const created = await createTask({
            listId: targetListId,
            title: finalTitle,
            notes: action.notes || undefined,
            due: action.due ? new Date(action.due) : undefined,
          });

          if (created?.id) {
            createdTaskMap.set(action.title.toLowerCase().trim(), created.id);
            createdTaskMap.set(cleanTitleFromQuadrant(action.title).toLowerCase().trim(), created.id);
          }
          return !!created;
        }

        case "CREATE_SUBTASK": {
          let parentId = action.parentTaskId;
          let listId = action.listId || fallbackListId;

          if (!parentId && action.parentTaskTitle) {
            const rawTitle = action.parentTaskTitle.toLowerCase().trim();
            const cleanTitle = cleanTitleFromQuadrant(action.parentTaskTitle).toLowerCase().trim();
            const lookup = createdTaskMap.get(cleanTitle) || createdTaskMap.get(rawTitle);
            if (lookup) {
              parentId = lookup;
            } else {
              for (const l of taskLists) {
                const found = (l.tasks || []).find((t) => {
                  const tClean = cleanTitleFromQuadrant(t.title).toLowerCase().trim();
                  const tRaw = t.title.toLowerCase().trim();
                  return tClean === cleanTitle || tRaw === rawTitle || tClean === rawTitle || tRaw === cleanTitle;
                });
                if (found) {
                  parentId = found.id;
                  listId = l.id;
                  break;
                }
              }
            }
          }

          if (parentId) {
            const sub = await createSubtask(listId, parentId, action.title);
            return !!sub;
          }
          return false;
        }

        case "UPDATE_TASK": {
          let listId = action.listId;
          let existingTask;
          for (const l of taskLists) {
            const t = (l.tasks || []).find((item) => item.id === action.taskId);
            if (t) {
              existingTask = t;
              if (!listId) listId = l.id;
              break;
            }
          }

          if (existingTask && listId) {
            let finalTitle = action.newTitle || existingTask.title;
            if (action.quadrant) {
              finalTitle = applyQuadrantToTitle(finalTitle, action.quadrant);
            }
            const updatedNotes =
              action.notes !== undefined ? action.notes : existingTask.notes;
            const due = action.due
              ? new Date(action.due)
              : existingTask.due
              ? new Date(existingTask.due)
              : undefined;

            return await updateTask(listId, action.taskId, finalTitle, updatedNotes, due);
          }
          return false;
        }

        case "DELETE_TASK": {
          let listId = action.listId;
          if (!listId) {
            for (const l of taskLists) {
              if ((l.tasks || []).some((t) => t.id === action.taskId)) {
                listId = l.id;
                break;
              }
            }
          }
          if (listId) {
            return await deleteTask(listId, action.taskId);
          }
          return false;
        }

        case "SET_QUADRANT": {
          let listId = action.listId;
          let targetTask;
          for (const l of taskLists) {
            const t = (l.tasks || []).find((item) => item.id === action.taskId);
            if (t) {
              targetTask = t;
              if (!listId) listId = l.id;
              break;
            }
          }

          if (targetTask && listId) {
            const updatedTitle = applyQuadrantToTitle(targetTask.title, action.quadrant);
            return await updateTask(
              listId,
              targetTask.id,
              updatedTitle,
              targetTask.notes,
              targetTask.due ? new Date(targetTask.due) : undefined
            );
          }
          return false;
        }

        case "CREATE_LIST": {
          const list = await createTaskList(action.title);
          return !!list;
        }

        case "RENAME_LIST": {
          return await renameTaskList(action.listId, action.newTitle);
        }

        case "DELETE_LIST": {
          return await deleteTaskList(action.listId);
        }

        default:
          return false;
      }
    } catch (err) {
      console.error("Failed to execute single action:", action, err);
      return false;
    }
  };

  // Apply selected actions
  const handleApplySelected = async (
    messageId: string,
    actions: AICopilotAction[]
  ) => {
    const fallbackListId =
      viewState.activeListId || taskLists[0]?.id || "default";
    const createdTaskMap = new Map<string, string>();

    const pendingIndices = actions
      .map((_, i) => i)
      .filter((i) => !appliedActionKeys.has(`${messageId}_${i}`) && !dismissedActionKeys.has(`${messageId}_${i}`));

    const currentSelected =
      selectedActionIndices[messageId] ?? new Set(pendingIndices);

    const toApplyIndices = pendingIndices.filter((i) => currentSelected.has(i));

    if (toApplyIndices.length === 0) {
      setToast({
        title: t("ai.noActionsSelected"),
        body: t("ai.selectAtLeastOneAction"),
        type: "warning",
      });
      return;
    }

    let appliedCount = 0;
    const newAppliedKeys = new Set(appliedActionKeys);

    for (const idx of toApplyIndices) {
      const act = actions[idx];
      const success = await executeSingleAction(act, createdTaskMap, fallbackListId);
      if (success) {
        newAppliedKeys.add(`${messageId}_${idx}`);
        appliedCount++;
      }
    }

    setAppliedActionKeys(newAppliedKeys);
    setToast({
      title: t("ai.actionsApplied"),
      body: t("ai.actionsAppliedCount", { count: appliedCount.toString() }),
      type: "success",
    });
  };

  // Apply single action
  const handleApplySingle = async (
    messageId: string,
    action: AICopilotAction,
    index: number
  ) => {
    const key = `${messageId}_${index}`;
    if (appliedActionKeys.has(key)) return;

    const fallbackListId =
      viewState.activeListId || taskLists[0]?.id || "default";
    const createdTaskMap = new Map<string, string>();

    const success = await executeSingleAction(action, createdTaskMap, fallbackListId);
    if (success) {
      setAppliedActionKeys((prev) => new Set(prev).add(key));
      setToast({
        title: t("ai.singleActionApplied"),
        body: t("ai.actionAppliedBody"),
        type: "success",
      });
    }
  };

  // Dismiss single action
  const handleDismissSingle = (messageId: string, index: number) => {
    const key = `${messageId}_${index}`;
    setDismissedActionKeys((prev) => new Set(prev).add(key));
    setToast({
      title: t("ai.actionDismissed"),
      body: t("ai.actionDismissedBody"),
      type: "info",
    });
  };

  // Dismiss all pending actions
  const handleDismissAll = (messageId: string, actions: AICopilotAction[]) => {
    const newDismissed = new Set(dismissedActionKeys);
    let count = 0;
    actions.forEach((_, idx) => {
      const key = `${messageId}_${idx}`;
      if (!appliedActionKeys.has(key)) {
        newDismissed.add(key);
        count++;
      }
    });
    setDismissedActionKeys(newDismissed);
    setToast({
      title: t("ai.actionsDismissedAll"),
      body: t("ai.actionsDismissedBody", { count: count.toString() }),
      type: "info",
    });
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return (
    <>
      <Dialog
        open={open && !isMinimized}
        onClose={onClose}
      fullScreen={isMaximized}
      maxWidth={isMaximized ? false : showHistory ? "lg" : "md"}
      fullWidth
      PaperProps={{
        sx: {
          height: isMaximized ? "100vh" : "85vh",
          maxHeight: isMaximized ? "100vh" : "90vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: isMaximized ? 0 : 3,
          m: isMaximized ? 0 : 2,
          overflow: "hidden",
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        },
      }}
    >
      {/* Top Header */}
      <DialogTitle
        sx={{
          m: 0,
          px: 2.5,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
          <AutoAwesome sx={{ color: "primary.main", fontSize: 24, flexShrink: 0 }} />
          <Box sx={{ minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="h6" fontWeight={700} noWrap>
                AI Copilot
              </Typography>
              {activeSession && (
                <Chip
                  size="small"
                  label={isDefaultChatTitle(activeSession.title) ? t("ai.newChat") : activeSession.title}
                  sx={{
                    maxWidth: 220,
                    fontFamily: "Cairo, sans-serif",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    bgcolor: "action.selected",
                  }}
                />
              )}
            </Box>
            
            {/* Quick Model Selector Chip */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
              <Chip
                size="small"
                variant="outlined"
                clickable
                onClick={(e) => setModelMenuAnchor(e.currentTarget)}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                    <Typography variant="caption" fontWeight={600}>
                      {providerDisplayName}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.5 }}>•</Typography>
                    <Typography variant="caption" fontWeight={600} color="primary.main">
                      {activeModelOption?.label || currentSettings.model}
                    </Typography>
                    {activeModelOption && (
                      <Chip
                        size="small"
                        label={
                          currentSettings.enableThinking === false && (activeModelOption.tag === "thinking" || activeModelOption.tag === "deep_thinking")
                            ? t("ai.modelTags.fast")
                            : t(`ai.modelTags.${MODEL_TAG_KEYS[activeModelOption.tag] || "custom"}`)
                        }
                        color={currentSettings.enableThinking !== false && (activeModelOption.tag === "thinking" || activeModelOption.tag === "deep_thinking") ? "primary" : "default"}
                        variant={currentSettings.enableThinking === false ? "outlined" : "filled"}
                        sx={{ height: 16, fontSize: '0.6rem', ml: 0.3 }}
                      />
                    )}
                    <KeyboardArrowDown sx={{ fontSize: 14, ml: 0.2, opacity: 0.7 }} />
                  </Box>
                }
                sx={{
                  height: 24,
                  bgcolor: 'action.hover',
                  borderColor: 'divider',
                  '&:hover': { bgcolor: 'action.selected', borderColor: 'primary.main' },
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Header Actions */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Tooltip title={t("ai.newChat")}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Add />}
              onClick={handleNewChat}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontSize: "0.82rem",
                px: 1.5,
                py: 0.4,
              }}
            >
              {t("ai.newChat")}
            </Button>
          </Tooltip>

          <Tooltip title={showHistory ? t("ai.hideHistory") : t("ai.showHistory")}>
            <IconButton
              size="small"
              color={showHistory ? "primary" : "default"}
              onClick={() => setShowHistory((prev) => !prev)}
            >
              <History fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={t("ai.minimizeToWidget")}>
            <IconButton size="small" onClick={() => setIsMinimized(true)}>
              <Remove fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title={isMaximized ? t("ai.restoreSize") : t("ai.maximize")}>
            <IconButton size="small" onClick={() => setIsMaximized((prev) => !prev)}>
              {isMaximized ? (
                <FullscreenExit fontSize="small" />
              ) : (
                <Fullscreen fontSize="small" />
              )}
            </IconButton>
          </Tooltip>

          <Tooltip title={t("ai.settings")}>
            <IconButton size="small" onClick={handleOpenAISettings}>
              <Tune fontSize="small" />
            </IconButton>
          </Tooltip>

          <IconButton size="small" onClick={onClose}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* Quick Model Switcher Menu */}
      <Menu
        anchorEl={modelMenuAnchor}
        open={Boolean(modelMenuAnchor)}
        onClose={() => setModelMenuAnchor(null)}
        PaperProps={{
          sx: { minWidth: 260, maxWidth: 360, borderRadius: 2, p: 0.5 },
        }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {t("ai.switchModel")} — {providerDisplayName}
          </Typography>
        </Box>
        {providerModels.map((m) => {
          const isSelected = m.id === currentSettings.model;
          return (
            <MenuItem
              key={m.id}
              selected={isSelected}
              onClick={() => handleSelectModel(m.id)}
              sx={{ py: 1, display: 'flex', justifyContent: 'space-between', gap: 1 }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                  <Typography variant="body2" fontWeight={isSelected ? 700 : 500}>
                    {m.label}
                  </Typography>
                  {isSelected && <Check sx={{ fontSize: 15, color: 'primary.main' }} />}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {m.id} {m.contextWindow ? `(${m.contextWindow})` : ''}
                </Typography>
              </Box>
              <Chip
                size="small"
                label={t(`ai.modelTags.${MODEL_TAG_KEYS[m.tag] || "custom"}`)}
                color={m.tag === "thinking" ? "primary" : m.tag === "deep_thinking" ? "secondary" : "default"}
                variant={m.tag === "no_thinking" || m.tag === "fast" ? "outlined" : "filled"}
                sx={{ height: 18, fontSize: '0.65rem' }}
              />
            </MenuItem>
          );
        })}

        {!providerModels.some((m) => m.id === currentSettings.model) && currentSettings.model && (
          <MenuItem
            selected
            onClick={() => handleSelectModel(currentSettings.model)}
            sx={{ py: 1, display: 'flex', justifyContent: 'space-between', gap: 1 }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Typography variant="body2" fontWeight={700}>
                  {currentSettings.model}
                </Typography>
                <Check sx={{ fontSize: 15, color: 'primary.main' }} />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {currentSettings.model}
              </Typography>
            </Box>
            <Chip
              size="small"
              label={t("ai.modelTags.custom")}
              sx={{ height: 18, fontSize: '0.65rem' }}
            />
          </MenuItem>
        )}

        {currentSettings.backupEnabled && currentSettings.backupModel && (
          <>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem onClick={handleQuickSwitchToBackup} sx={{ py: 1 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                <ShieldOutlined sx={{ fontSize: 18, color: 'secondary.main' }} />
              </ListItemIcon>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="body2" fontWeight={600} color="secondary.main">
                  {t("ai.quickSwitchToBackup")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {(currentSettings.backupProvider || "").toUpperCase()} • {currentSettings.backupModel}
                </Typography>
              </Box>
            </MenuItem>
          </>
        )}

        {modelSupportsThinking(currentSettings.provider, currentSettings.model) && (
          <>
            <Divider sx={{ my: 0.5 }} />
            <MenuItem
              onClick={handleToggleThinking}
              sx={{ py: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Psychology sx={{ fontSize: 18, color: currentSettings.enableThinking !== false ? 'primary.main' : 'text.disabled' }} />
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="body2" fontWeight={500}>
                    {t("ai.enableThinking")}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {currentSettings.enableThinking !== false ? t("ai.modelTags.thinking") : t("ai.modelTags.fast")}
                  </Typography>
                </Box>
              </Box>
              <Switch
                size="small"
                checked={currentSettings.enableThinking !== false}
                onChange={handleToggleThinking}
                color="primary"
              />
            </MenuItem>
          </>
        )}

        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={handleOpenAISettings} sx={{ py: 1 }}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <Tune sx={{ fontSize: 18 }} />
          </ListItemIcon>
          <Typography variant="body2">{t("settings.modelsAndKeysVault")}</Typography>
        </MenuItem>
      </Menu>

      {/* Main Body: Flex row containing history sidebar + chat content */}
      <Box sx={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
        {/* Chat History Sidebar */}
        {showHistory && (
          <Fade in={showHistory}>
            <Box
              sx={{
                width: 270,
                borderRight: 1,
                borderColor: "divider",
                bgcolor: "action.hover",
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  p: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: 1,
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                >
                  {t("ai.history")} ({sessions.length})
                </Typography>
                <IconButton size="small" onClick={handleNewChat}>
                  <Add fontSize="small" />
                </IconButton>
              </Box>

              <List sx={{ flex: 1, overflowY: "auto", p: 1, gap: 0.5 }}>
                {sessions.map((s) => {
                  const isActive = s.id === activeSessionId;
                  const dateStr = new Date(s.updatedAt).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US", {
                    month: "short",
                    day: "numeric",
                  });

                  return (
                    <ListItem
                      key={s.id}
                      disablePadding
                      secondaryAction={
                        <Tooltip title={t("ai.deleteConversation")}>
                          <IconButton
                            edge="end"
                            size="small"
                            onClick={(e) => handleDeleteSession(e, s.id)}
                            sx={{
                              opacity: 0.6,
                              "&:hover": { opacity: 1, color: "error.main" },
                            }}
                          >
                            <DeleteOutline sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      }
                      sx={{ mb: 0.5 }}
                    >
                      <ListItemButton
                        selected={isActive}
                        onClick={() => handleSelectSession(s.id)}
                        sx={{
                          borderRadius: 2,
                          py: 1,
                          pr: 4,
                          "&.Mui-selected": {
                            bgcolor: "primary.main",
                            color: "primary.contrastText",
                            "&:hover": {
                              bgcolor: "primary.dark",
                            },
                          },
                        }}
                      >
                        <ChatBubbleOutline
                          sx={{
                            fontSize: 16,
                            mr: 1,
                            opacity: isActive ? 1 : 0.6,
                          }}
                        />
                        <ListItemText
                          primary={isDefaultChatTitle(s.title) ? t("ai.newChat") : s.title}
                          secondary={dateStr}
                          primaryTypographyProps={{
                            fontSize: "0.85rem",
                            fontWeight: isActive ? 700 : 500,
                            noWrap: true,
                            fontFamily: "Cairo, sans-serif",
                            color: isActive ? "inherit" : "text.primary",
                          }}
                          secondaryTypographyProps={{
                            fontSize: "0.7rem",
                            fontFamily: "Cairo, sans-serif",
                            color: isActive ? "rgba(255,255,255,0.7)" : "text.secondary",
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          </Fade>
        )}

        {/* Right Chat Column */}
        <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          {/* Missing API Key Warning Banner */}
          {isMissingKey && (
            <Box
              sx={{
                px: 2,
                pt: 1.5,
                pb: 1,
                flexShrink: 0,
                bgcolor: "background.paper",
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <Alert
                severity="warning"
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  alignItems: "center",
                  py: 0.5,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(237, 108, 2, 0.12)"
                      : "rgba(237, 108, 2, 0.08)",
                  borderColor: "warning.main",
                }}
                action={
                  <Button
                    color="warning"
                    size="small"
                    variant="contained"
                    onClick={handleOpenAISettings}
                    startIcon={<Tune sx={{ fontSize: 16 }} />}
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      borderRadius: 1.5,
                      px: 1.5,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t("ai.configureKeyBtn")}
                  </Button>
                }
              >
                <Typography variant="subtitle2" fontWeight={700}>
                  {t("ai.apiKeyRequiredTitle")}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {t("ai.apiKeyRequiredBody", { provider: providerDisplayName })}
                </Typography>
              </Alert>
            </Box>
          )}

          {/* Quick Prompts Bar */}
          <Box
            sx={{
              px: 2,
              py: 1.25,
              display: "flex",
              gap: 1,
              overflowX: "auto",
              bgcolor: "action.hover",
              borderBottom: 1,
              borderColor: "divider",
              flexShrink: 0,
            }}
          >
            {quickPrompts.map((q, idx) => (
              <Chip
                key={idx}
                label={`${q.icon} ${q.label}`}
                size="small"
                clickable
                onClick={() => setInput(q.prompt)}
                sx={{
                  fontFamily: "Cairo, sans-serif",
                  fontSize: "0.8rem",
                  bgcolor: "background.paper",
                  boxShadow: 1,
                  "&:hover": { bgcolor: "primary.light", color: "primary.contrastText" },
                }}
              />
            ))}
          </Box>

          {/* Messages Scroll Area */}
          <DialogContent sx={{ flex: 1, p: 2.5, overflowY: "auto" }}>
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              const isCopied = copiedId === msg.id;

              // Action counts for this message
              const actions = msg.actions || [];
              const totalActions = actions.length;
              const pendingIndices = actions
                .map((_, i) => i)
                .filter(
                  (i) =>
                    !appliedActionKeys.has(`${msg.id}_${i}`) &&
                    !dismissedActionKeys.has(`${msg.id}_${i}`)
                );
              const currentSelected =
                selectedActionIndices[msg.id] ?? new Set(pendingIndices);
              const selectedCount = pendingIndices.filter((i) =>
                currentSelected.has(i)
              ).length;
              const allSelected =
                pendingIndices.length > 0 &&
                pendingIndices.every((i) => currentSelected.has(i));

              return (
                <Box
                  key={msg.id}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isUser ? "flex-end" : "flex-start",
                    mb: 2.5,
                  }}
                >
                  <Paper
                    elevation={isUser ? 2 : 0}
                    sx={{
                      p: 2,
                      maxWidth: isUser ? "75%" : "90%",
                      width: isUser ? "auto" : "100%",
                      borderRadius: 2.5,
                      bgcolor: isUser ? "primary.main" : "background.paper",
                      color: isUser ? "primary.contrastText" : "text.primary",
                      border: isUser ? "none" : "1px solid",
                      borderColor: "divider",
                      position: "relative",
                    }}
                  >
                    {/* Top row inside assistant bubble: label and copy button */}
                    {!isUser && (
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 1,
                          pb: 0.75,
                          borderBottom: "1px dashed",
                          borderColor: "divider",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          <AutoAwesome sx={{ fontSize: 16, color: "primary.main" }} />
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              color: "primary.main",
                              fontFamily: "Cairo, sans-serif",
                            }}
                          >
                            AI Copilot
                          </Typography>
                        </Box>

                        <Tooltip title={isCopied ? t("common.copied") : t("ai.copyResponse")}>
                          <IconButton
                            size="small"
                            onClick={() => handleCopy(msg.id, msg.content)}
                            sx={{
                              p: 0.5,
                              color: isCopied ? "success.main" : "text.secondary",
                            }}
                          >
                            {isCopied ? (
                              <Check sx={{ fontSize: 16 }} />
                            ) : (
                              <ContentCopy sx={{ fontSize: 16 }} />
                            )}
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}

                    {/* Markdown rendering with Cairo font & RTL/LTR support */}
                    <MarkdownViewer content={msg.content} isUser={isUser} />

                    {/* Quick switch to backup button on capacity error */}
                    {msg.content.includes(t("ai.highDemandNotice")) && currentSettings.backupEnabled && currentSettings.backupModel && (
                      <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px dashed', borderColor: 'divider', display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="secondary"
                          startIcon={<ShieldOutlined sx={{ fontSize: 16 }} />}
                          onClick={() => {
                            handleQuickSwitchToBackup();
                          }}
                          sx={{ textTransform: 'none', borderRadius: 2, fontSize: '0.78rem' }}
                        >
                          {t("ai.quickSwitchToBackup")} ({currentSettings.backupModel})
                        </Button>
                      </Box>
                    )}
                  </Paper>

                  {/* Enhanced Granular Actions Preview Card */}
                  {totalActions > 0 && (
                    <Paper
                      sx={{
                        mt: 1.5,
                        p: 2,
                        maxWidth: "90%",
                        width: "100%",
                        borderRadius: 2.5,
                        bgcolor: "action.hover",
                        border: "1.5px solid",
                        borderColor: "primary.light",
                      }}
                    >
                      {/* Top Bar: Select all, count, Apply Selected / Apply All / Reject All */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: 1.5,
                          mb: 1.5,
                          pb: 1.5,
                          borderBottom: 1,
                          borderColor: "divider",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Checkbox
                            size="small"
                            checked={allSelected}
                            indeterminate={
                              selectedCount > 0 && selectedCount < pendingIndices.length
                            }
                            disabled={pendingIndices.length === 0}
                            onChange={() => toggleSelectAll(msg.id, actions)}
                            sx={{ p: 0.5 }}
                          />
                          <Box>
                            <Typography
                              variant="subtitle2"
                              fontWeight={700}
                              sx={{ fontFamily: "Cairo, sans-serif" }}
                            >
                              {t("ai.suggestedActionsCount", { count: totalActions })}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontFamily: "Cairo, sans-serif" }}
                            >
                              {t("ai.selectedActionsSummary", { selected: selectedCount, total: pendingIndices.length })}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          {/* Apply Selected Button */}
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            disabled={selectedCount === 0}
                            startIcon={<CheckCircleOutline />}
                            onClick={() => handleApplySelected(msg.id, actions)}
                            sx={{ fontFamily: "Cairo, sans-serif", fontSize: "0.8rem", px: 1.5 }}
                          >
                            {t("ai.applySelectedCount", { count: selectedCount })}
                          </Button>

                          {/* Reject All Button */}
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            disabled={pendingIndices.length === 0}
                            startIcon={<PlaylistRemove />}
                            onClick={() => handleDismissAll(msg.id, actions)}
                            sx={{ fontFamily: "Cairo, sans-serif", fontSize: "0.8rem", px: 1.5 }}
                          >
                            {t("ai.dismissAll")}
                          </Button>
                        </Box>
                      </Box>

                      {/* Granular Action Items List */}
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        {actions.map((act, i) => {
                          const actionKey = `${msg.id}_${i}`;
                          const isApplied = appliedActionKeys.has(actionKey);
                          const isDismissed = dismissedActionKeys.has(actionKey);
                          const isPending = !isApplied && !isDismissed;
                          const isSelected = isActionSelected(msg.id, i);

                          return (
                            <Box
                              key={i}
                              sx={{
                                p: 1.25,
                                borderRadius: 1.75,
                                bgcolor: isApplied
                                  ? "rgba(46, 125, 50, 0.08)"
                                  : isDismissed
                                  ? "action.disabledBackground"
                                  : "background.paper",
                                border: "1px solid",
                                borderColor: isApplied
                                  ? "success.main"
                                  : isDismissed
                                  ? "divider"
                                  : "divider",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 1,
                                opacity: isDismissed ? 0.6 : 1,
                                transition: "all 0.2s ease",
                              }}
                            >
                              {/* Left Checkbox & Action Details */}
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1.25,
                                  overflow: "hidden",
                                  flex: 1,
                                }}
                              >
                                <Checkbox
                                  size="small"
                                  checked={isSelected}
                                  disabled={!isPending}
                                  onChange={() => toggleActionSelect(msg.id, i, totalActions)}
                                  sx={{ p: 0.25 }}
                                />

                                {/* Action Type Badge */}
                                {act.type === "CREATE_TASK" && (
                                  <Chip
                                    size="small"
                                    label={t("tasks.addTask")}
                                    color="success"
                                    sx={{ height: 22, fontSize: "0.72rem", fontWeight: 700 }}
                                  />
                                )}
                                {act.type === "CREATE_SUBTASK" && (
                                  <Chip
                                    size="small"
                                    label={t("tasks.subtasks")}
                                    color="success"
                                    variant="outlined"
                                    sx={{ height: 22, fontSize: "0.72rem", fontWeight: 700 }}
                                  />
                                )}
                                {act.type === "UPDATE_TASK" && (
                                  <Chip
                                    size="small"
                                    label={t("common.edit")}
                                    color="info"
                                    sx={{ height: 22, fontSize: "0.72rem", fontWeight: 700 }}
                                  />
                                )}
                                {act.type === "DELETE_TASK" && (
                                  <Chip
                                    size="small"
                                    label={t("common.delete")}
                                    color="error"
                                    sx={{ height: 22, fontSize: "0.72rem", fontWeight: 700 }}
                                  />
                                )}
                                {act.type === "SET_QUADRANT" && (
                                  <Chip
                                    size="small"
                                    label={t("ai.priorityChip")}
                                    color="secondary"
                                    sx={{ height: 22, fontSize: "0.72rem", fontWeight: 700 }}
                                  />
                                )}
                                {act.type === "CREATE_LIST" && (
                                  <Chip
                                    size="small"
                                    label={t("ai.newListChip")}
                                    color="primary"
                                    sx={{ height: 22, fontSize: "0.72rem", fontWeight: 700 }}
                                  />
                                )}
                                {act.type === "RENAME_LIST" && (
                                  <Chip
                                    size="small"
                                    label={t("ai.renameListChip")}
                                    color="info"
                                    sx={{ height: 22, fontSize: "0.72rem", fontWeight: 700 }}
                                  />
                                )}
                                {act.type === "DELETE_LIST" && (
                                  <Chip
                                    size="small"
                                    label={t("ai.deleteListChip")}
                                    color="error"
                                    sx={{ height: 22, fontSize: "0.72rem", fontWeight: 700 }}
                                  />
                                )}

                                {/* Specific Text Details */}
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, overflow: "hidden", flex: 1 }}>
                                  {act.type === "CREATE_TASK" && (
                                    <>
                                      <Typography
                                        variant="body2"
                                        fontWeight={600}
                                        sx={{ fontFamily: "Cairo, sans-serif" }}
                                        noWrap
                                      >
                                        📝 {act.title}
                                      </Typography>
                                      {act.quadrant && (
                                        <Chip
                                          size="small"
                                          label={act.quadrant}
                                          sx={{
                                            height: 20,
                                            fontSize: "0.7rem",
                                            fontWeight: 700,
                                            bgcolor: quadrantColors[act.quadrant]?.bg,
                                            color: quadrantColors[act.quadrant]?.color,
                                          }}
                                        />
                                      )}
                                      {act.due && (
                                        <Chip
                                          size="small"
                                          icon={<CalendarToday sx={{ fontSize: "0.75rem !important" }} />}
                                          label={act.due}
                                          variant="outlined"
                                          sx={{ height: 20, fontSize: "0.7rem" }}
                                        />
                                      )}
                                    </>
                                  )}

                                  {act.type === "CREATE_SUBTASK" && (
                                    <Typography
                                      variant="body2"
                                      sx={{ fontFamily: "Cairo, sans-serif" }}
                                      noWrap
                                    >
                                      ↳ ▫️ {act.title}{" "}
                                      <Typography variant="caption" color="text.secondary">
                                        ({t("ai.underTask", { task: act.parentTaskTitle || "" })})
                                      </Typography>
                                    </Typography>
                                  )}

                                  {act.type === "UPDATE_TASK" && (
                                    <Typography
                                      variant="body2"
                                      sx={{ fontFamily: "Cairo, sans-serif" }}
                                      noWrap
                                    >
                                      ✏️ {act.taskTitle}{" "}
                                      {act.newTitle && (
                                        <b> ➔ {act.newTitle}</b>
                                      )}
                                      {act.quadrant && ` [${act.quadrant}]`}
                                      {act.due && ` [${act.due}]`}
                                    </Typography>
                                  )}

                                  {act.type === "DELETE_TASK" && (
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, overflow: "hidden" }}>
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          fontFamily: "Cairo, sans-serif",
                                          textDecoration: "line-through",
                                          color: "error.main",
                                          fontWeight: 600,
                                        }}
                                        noWrap
                                      >
                                        🗑️ {act.taskTitle}
                                      </Typography>
                                      {act.reason && (
                                        <Chip
                                          size="small"
                                          label={act.reason}
                                          sx={{ height: 18, fontSize: "0.68rem" }}
                                        />
                                      )}
                                    </Box>
                                  )}

                                  {act.type === "SET_QUADRANT" && (
                                    <Typography
                                      variant="body2"
                                      sx={{ fontFamily: "Cairo, sans-serif" }}
                                      noWrap
                                    >
                                      🎯 {act.taskTitle} ➔ <b>{act.quadrant}</b>
                                    </Typography>
                                  )}

                                  {act.type === "CREATE_LIST" && (
                                    <Typography
                                      variant="body2"
                                      fontWeight={600}
                                      sx={{ fontFamily: "Cairo, sans-serif" }}
                                      noWrap
                                    >
                                      📁 {act.title}
                                    </Typography>
                                  )}

                                  {act.type === "RENAME_LIST" && (
                                    <Typography
                                      variant="body2"
                                      sx={{ fontFamily: "Cairo, sans-serif" }}
                                      noWrap
                                    >
                                      📁 {act.currentTitle || t("ai.listLabel")} ➔ <b>{act.newTitle}</b>
                                    </Typography>
                                  )}

                                  {act.type === "DELETE_LIST" && (
                                    <Typography
                                      variant="body2"
                                      sx={{
                                        fontFamily: "Cairo, sans-serif",
                                        textDecoration: "line-through",
                                        color: "error.main",
                                        fontWeight: 600,
                                      }}
                                      noWrap
                                    >
                                      🗑️ {t("ai.listLabel")}: {act.listTitle}
                                    </Typography>
                                  )}
                                </Box>
                              </Box>

                              {/* Right Individual Item Actions */}
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0 }}>
                                {isApplied && (
                                  <Chip
                                    size="small"
                                    color="success"
                                    icon={<Check sx={{ fontSize: "14px !important" }} />}
                                    label={t("ai.appliedBadge")}
                                    sx={{ height: 24, fontSize: "0.75rem", fontFamily: "Cairo, sans-serif" }}
                                  />
                                )}

                                {isDismissed && (
                                  <Chip
                                    size="small"
                                    variant="outlined"
                                    label={t("ai.dismissedBadge")}
                                    sx={{ height: 24, fontSize: "0.75rem", fontFamily: "Cairo, sans-serif" }}
                                  />
                                )}

                                {isPending && (
                                  <>
                                    <Button
                                      size="small"
                                      variant="contained"
                                      color={act.type.includes("DELETE") ? "error" : "success"}
                                      onClick={() => handleApplySingle(msg.id, act, i)}
                                      sx={{
                                        height: 26,
                                        fontSize: "0.75rem",
                                        fontFamily: "Cairo, sans-serif",
                                        px: 1.25,
                                        textTransform: "none",
                                      }}
                                    >
                                      {act.type.includes("DELETE")
                                        ? t("ai.confirmDelete")
                                        : t("ai.acceptAndApply")}
                                    </Button>

                                    <Tooltip title={t("ai.dismissThisChange")}>
                                      <IconButton
                                        size="small"
                                        color="default"
                                        onClick={() => handleDismissSingle(msg.id, i)}
                                        sx={{ p: 0.5, "&:hover": { color: "error.main" } }}
                                      >
                                        <CancelOutlined sx={{ fontSize: 18 }} />
                                      </IconButton>
                                    </Tooltip>
                                  </>
                                )}
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    </Paper>
                  )}
                </Box>
              );
            })}

            {loading && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, my: 2 }}>
                <CircularProgress size={20} />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontFamily: "Cairo, sans-serif" }}
                >
                  {t("ai.processingRequest")}
                </Typography>
              </Box>
            )}
            <div ref={messagesEndRef} />
          </DialogContent>

          <Divider />

          {/* Input Bar */}
          <DialogActions sx={{ p: 2, gap: 1, bgcolor: "background.paper" }}>
            <TextField
              placeholder={t("ai.inputPlaceholder")}
              fullWidth
              size="small"
              multiline
              maxRows={4}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={loading}
              inputProps={{
                dir: "auto",
              }}
            />
            <Button
              variant="contained"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              sx={{ minWidth: 48, height: 40, px: 2 }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : <Send />}
            </Button>
          </DialogActions>
        </Box>
      </Box>
    </Dialog>

    {/* Floating Messenger-style Icon Bubble when Minimized */}
    {open && isMinimized && (
      <Portal>
        <Fade in={open && isMinimized}>
          <Paper
            elevation={10}
            sx={{
              position: "fixed",
              bottom: 24,
              ...(isRtl ? { left: 24 } : { right: 24 }),
              zIndex: 1300,
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              p: 0.5,
              borderRadius: "32px",
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: loading ? "primary.main" : "divider",
              boxShadow: (theme) =>
                loading
                  ? `0 0 16px ${theme.palette.primary.main}66, 0 6px 20px rgba(0,0,0,0.3)`
                  : "0 6px 20px rgba(0,0,0,0.22)",
              transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: (theme) =>
                  `0 10px 28px rgba(0,0,0,0.28), 0 0 12px ${theme.palette.primary.main}44`,
                borderColor: "primary.main",
              },
              userSelect: "none",
            }}
          >
            {/* Clickable AI Chat Bubble Icon */}
            <Tooltip title={t("ai.expandWidget")}>
              <IconButton
                onClick={() => setIsMinimized(false)}
                color="primary"
                sx={{
                  width: 44,
                  height: 44,
                  position: "relative",
                  bgcolor: (theme) => `${theme.palette.primary.main}18`,
                  "&:hover": {
                    bgcolor: (theme) => `${theme.palette.primary.main}2a`,
                  },
                }}
              >
                {loading && (
                  <CircularProgress
                    size={44}
                    thickness={3.5}
                    sx={{
                      position: "absolute",
                      color: "primary.main",
                    }}
                  />
                )}
                <AutoAwesome sx={{ fontSize: 22 }} />
              </IconButton>
            </Tooltip>

            {/* Close Button */}
            <Tooltip title={t("common.close")}>
              <IconButton
                size="small"
                onClick={() => {
                  setIsMinimized(false);
                  onClose();
                }}
                sx={{
                  width: 28,
                  height: 28,
                  color: "text.secondary",
                  "&:hover": {
                    color: "error.main",
                    bgcolor: "action.hover",
                  },
                }}
              >
                <Close sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Paper>
        </Fade>
      </Portal>
    )}
  </>
  );
}
