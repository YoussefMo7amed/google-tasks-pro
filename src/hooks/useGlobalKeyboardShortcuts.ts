/**
 * Global Keyboard Shortcuts Hook
 * 
 * Centralized keyboard listener for the desktop app.
 * Provides undo/redo, modal toggles, view switching, and shortcuts map.
 * Automatically respects native inputs/textareas to prevent hijacking text editing.
 */

import { useEffect } from "react";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import {
  aiCopilotOpenAtom,
  aiCopilotMinimizedAtom,
  settingsOpenAtom,
  shortcutsModalOpenAtom,
  addCategoryOpenAtom,
  createTaskModalOpenAtom,
  taskViewModeAtom,
  viewStateAtom,
  taskListsAtom,
  toastAtom,
} from "../store";
import { useUndoRedo } from "./useUndoRedo";
import { useTranslation } from "../i18n";

interface GlobalShortcutsOptions {
  onSync?: () => void;
  onOpenCreateTask?: () => void;
  onOpenCreateList?: () => void;
}

export function useGlobalKeyboardShortcuts(options?: GlobalShortcutsOptions) {
  const { t, language } = useTranslation();
  const [aiCopilotOpen, setAiCopilotOpen] = useRecoilState(aiCopilotOpenAtom);
  const [isAiMinimized, setIsAiMinimized] = useRecoilState(aiCopilotMinimizedAtom);
  const [settingsOpen, setSettingsOpen] = useRecoilState(settingsOpenAtom);
  const [shortcutsOpen, setShortcutsOpen] = useRecoilState(shortcutsModalOpenAtom);
  const [addCategoryOpen, setAddCategoryOpen] = useRecoilState(addCategoryOpenAtom);
  const [createTaskModalOpen, setCreateTaskModalOpen] = useRecoilState(createTaskModalOpenAtom);
  const [taskViewMode, setTaskViewMode] = useRecoilState(taskViewModeAtom);
  const [viewState, setViewState] = useRecoilState(viewStateAtom);
  const taskLists = useRecoilValue(taskListsAtom);
  const setToast = useSetRecoilState(toastAtom);
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable);

      const isMac = typeof navigator !== "undefined" && navigator.platform?.toUpperCase().indexOf("MAC") >= 0;
      const isMod = isMac ? e.metaKey : e.ctrlKey;

      // 1. Undo: Cmd+Z or Ctrl+Z (without Shift)
      // Checks e.code KeyZ as well as Arabic keyboard characters 'ئ' (Mac) and 'ظ' (Windows)
      const isUndoKey =
        isMod &&
        !e.shiftKey &&
        (e.code === "KeyZ" || e.key.toLowerCase() === "z" || e.key === "ئ" || e.key === "ظ");
      if (isUndoKey) {
        if (isInputActive) {
          // Allow native input undo
          return;
        }
        e.preventDefault();
        if (canUndo) {
          try {
            const undone = await undo();
            if (undone) {
              const actionLabel = language === "ar" ? undone.descriptionAr : undone.description;
              setToast({
                title: t("shortcuts.undoneNotice", { action: actionLabel }),
                type: "info",
              });
            }
          } catch (err) {
            console.error("Undo error:", err);
          }
        } else {
          setToast({
            title: t("shortcuts.nothingToUndo"),
            type: "info",
          });
        }
        return;
      }

      // 2. Redo: Cmd+Shift+Z, Ctrl+Shift+Z, or Ctrl+Y
      const isRedoKey =
        (isMod &&
          e.shiftKey &&
          (e.code === "KeyZ" || e.key.toLowerCase() === "z" || e.key === "ئ" || e.key === "ظ")) ||
        (!isMac &&
          e.ctrlKey &&
          (e.code === "KeyY" || e.key.toLowerCase() === "y" || e.key === "غ" || e.key === "إ"));

      if (isRedoKey) {
        if (isInputActive) {
          // Allow native input redo
          return;
        }
        e.preventDefault();
        if (canRedo) {
          try {
            const redone = await redo();
            if (redone) {
              const actionLabel = language === "ar" ? redone.descriptionAr : redone.description;
              setToast({
                title: t("shortcuts.redoneNotice", { action: actionLabel }),
                type: "info",
              });
            }
          } catch (err) {
            console.error("Redo error:", err);
          }
        } else {
          setToast({
            title: t("shortcuts.nothingToRedo"),
            type: "info",
          });
        }
        return;
      }

      // 3. AI Copilot: Cmd+K / Ctrl+K
      const isAiKey = isMod && (e.code === "KeyK" || e.key.toLowerCase() === "k" || e.key === "ن");
      if (isAiKey) {
        e.preventDefault();
        if (aiCopilotOpen && isAiMinimized) {
          setIsAiMinimized(false);
        } else {
          setAiCopilotOpen((prev) => {
            const next = !prev;
            if (!next) setIsAiMinimized(false);
            return next;
          });
        }
        return;
      }

      // 4. Settings: Cmd+, / Ctrl+,
      const isSettingsKey = isMod && (e.code === "Comma" || e.key === "," || e.key === "،" || e.key === "و");
      if (isSettingsKey) {
        e.preventDefault();
        setSettingsOpen((prev) => !prev);
        return;
      }

      // 5. Sync: Cmd+R / Ctrl+R
      const isSyncKey = isMod && (e.code === "KeyR" || e.key.toLowerCase() === "r" || e.key === "ق");
      if (isSyncKey) {
        e.preventDefault();
        options?.onSync?.();
        return;
      }

      // 6. Escape: Close any open modal
      if (e.key === "Escape") {
        if (shortcutsOpen) {
          e.preventDefault();
          setShortcutsOpen(false);
          return;
        }
        if (createTaskModalOpen) {
          e.preventDefault();
          setCreateTaskModalOpen(false);
          return;
        }
        if (addCategoryOpen) {
          e.preventDefault();
          setAddCategoryOpen(false);
          return;
        }
        if (aiCopilotOpen) {
          e.preventDefault();
          setAiCopilotOpen(false);
          return;
        }
        if (settingsOpen) {
          e.preventDefault();
          setSettingsOpen(false);
          return;
        }
      }

      // 7. Ctrl + Tab / Ctrl + Shift + Tab: Switch between sidebar tabs
      if (e.ctrlKey && (e.key === "Tab" || e.code === "Tab")) {
        e.preventDefault();

        // 0: All, 1: Starred, 2: Eisenhower, 3: Analytics, 4: Trash, 5+: User lists
        const totalItems = 5 + taskLists.length;
        if (totalItems <= 1) return;

        let currentIndex = 0;
        if (viewState.view === "all") currentIndex = 0;
        else if (viewState.view === "starred") currentIndex = 1;
        else if (viewState.view === "eisenhower") currentIndex = 2;
        else if (viewState.view === "analytics") currentIndex = 3;
        else if (viewState.view === "trash") currentIndex = 4;
        else if (viewState.view === "list") {
          const listIdx = taskLists.findIndex((l) => l.id === viewState.activeListId);
          currentIndex = listIdx !== -1 ? 5 + listIdx : 0;
        }

        const nextIndex = e.shiftKey
          ? (currentIndex - 1 + totalItems) % totalItems
          : (currentIndex + 1) % totalItems;

        if (nextIndex === 0) {
          setViewState({ view: "all", activeListId: undefined, activeListIndex: -1 });
          if (taskViewMode === "eisenhower") setTaskViewMode("board");
        } else if (nextIndex === 1) {
          setViewState({ view: "starred", activeListId: undefined, activeListIndex: -2 });
          if (taskViewMode === "eisenhower") setTaskViewMode("board");
        } else if (nextIndex === 2) {
          setViewState({ view: "eisenhower", activeListId: undefined, activeListIndex: -3 });
          setTaskViewMode("eisenhower");
        } else if (nextIndex === 3) {
          setViewState({ view: "analytics", activeListId: undefined, activeListIndex: -4 });
          if (taskViewMode === "eisenhower") setTaskViewMode("board");
        } else if (nextIndex === 4) {
          setViewState({ view: "trash", activeListId: undefined, activeListIndex: -5 });
          if (taskViewMode === "eisenhower") setTaskViewMode("board");
        } else {
          const list = taskLists[nextIndex - 5];
          if (list) {
            setViewState({ view: "list", activeListId: list.id, activeListIndex: nextIndex - 5 });
            if (taskViewMode === "eisenhower") setTaskViewMode("board");
          }
        }
        return;
      }

      // Below shortcuts ONLY apply when not typing inside an input/textarea
      if (isInputActive) return;

      // 7. Shortcuts Cheat Sheet: ? (Shift+/) or Arabic ؟
      const isQuestionMark =
        e.key === "?" ||
        e.key === "؟" ||
        (e.shiftKey && (e.code === "Slash" || e.code === "Digit8" || e.key === "?"));
      if (isQuestionMark) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }

      // 8. New Task: N or C (handles physical KeyN/KeyC and Arabic layout ى / ؤ)
      const isNewTaskKey =
        !isMod &&
        (e.code === "KeyN" ||
          e.code === "KeyC" ||
          e.key.toLowerCase() === "n" ||
          e.key.toLowerCase() === "c" ||
          e.key === "ى" ||
          e.key === "ؤ");
      if (isNewTaskKey) {
        e.preventDefault();
        if (options?.onOpenCreateTask) {
          options.onOpenCreateTask();
        } else {
          // If inline add-task button exists on screen, click it; otherwise open quick create dialog
          const inlineBtn = document.querySelector<HTMLElement>("[data-add-task-btn='true']");
          if (inlineBtn && inlineBtn.offsetParent !== null) {
            inlineBtn.click();
          } else {
            setCreateTaskModalOpen(true);
          }
        }
        return;
      }

      // 9. New List: L (handles physical KeyL and Arabic layout م)
      const isNewListKey =
        !isMod &&
        (e.code === "KeyL" ||
          e.key.toLowerCase() === "l" ||
          e.key === "م");
      if (isNewListKey) {
        e.preventDefault();
        if (options?.onOpenCreateList) {
          options.onOpenCreateList();
        } else {
          setAddCategoryOpen(true);
        }
        return;
      }

      // 10. Switch Views: 1 (Board), 2 (List), 3 (Calendar), 4 (Eisenhower)
      // Supports physical codes Digit1..4 / Numpad1..4, English '1'..'4', and Arabic '١'..'٤' / '۱'..'۴'
      if (!isMod && !e.shiftKey && !e.altKey) {
        const isOne = e.code === "Digit1" || e.code === "Numpad1" || e.key === "1" || e.key === "١" || e.key === "۱";
        const isTwo = e.code === "Digit2" || e.code === "Numpad2" || e.key === "2" || e.key === "٢" || e.key === "۲";
        const isThree = e.code === "Digit3" || e.code === "Numpad3" || e.key === "3" || e.key === "٣" || e.key === "۳";
        const isFour = e.code === "Digit4" || e.code === "Numpad4" || e.key === "4" || e.key === "٤" || e.key === "۴";

        if (isOne) {
          e.preventDefault();
          setTaskViewMode("board");
          setViewState((prev) => ({ ...prev, view: "all" }));
        } else if (isTwo) {
          e.preventDefault();
          setTaskViewMode("list");
          setViewState((prev) => ({ ...prev, view: "all" }));
        } else if (isThree) {
          e.preventDefault();
          setTaskViewMode("calendar");
          setViewState((prev) => ({ ...prev, view: "all" }));
        } else if (isFour) {
          e.preventDefault();
          setTaskViewMode("eisenhower");
          setViewState((prev) => ({ ...prev, view: "eisenhower" }));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canUndo,
    canRedo,
    undo,
    redo,
    shortcutsOpen,
    createTaskModalOpen,
    addCategoryOpen,
    aiCopilotOpen,
    settingsOpen,
    setAiCopilotOpen,
    setSettingsOpen,
    setShortcutsOpen,
    setCreateTaskModalOpen,
    setAddCategoryOpen,
    setTaskViewMode,
    setViewState,
    taskLists,
    viewState,
    taskViewMode,
    setToast,
    t,
    language,
    options,
  ]);
}
