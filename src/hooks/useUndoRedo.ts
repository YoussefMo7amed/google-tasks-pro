/**
 * Undo / Redo Hook
 * 
 * Provides reactive access to undo/redo state, actions, and execution methods.
 */

import { useState, useEffect, useCallback } from "react";
import { undoRedoService, UndoAction } from "../services/undo-redo.service";
import { useTranslation } from "../i18n";

export function useUndoRedo() {
  const { language } = useTranslation();
  const [canUndo, setCanUndo] = useState(undoRedoService.canUndo());
  const [canRedo, setCanRedo] = useState(undoRedoService.canRedo());
  const [undoAction, setUndoAction] = useState<UndoAction | undefined>(undoRedoService.getUndoAction());
  const [redoAction, setRedoAction] = useState<UndoAction | undefined>(undoRedoService.getRedoAction());

  useEffect(() => {
    const unsubscribe = undoRedoService.subscribe(() => {
      setCanUndo(undoRedoService.canUndo());
      setCanRedo(undoRedoService.canRedo());
      setUndoAction(undoRedoService.getUndoAction());
      setRedoAction(undoRedoService.getRedoAction());
    });
    return unsubscribe;
  }, []);

  const undo = useCallback(async (): Promise<UndoAction | null> => {
    return await undoRedoService.undo();
  }, []);

  const redo = useCallback(async (): Promise<UndoAction | null> => {
    return await undoRedoService.redo();
  }, []);

  const getUndoLabel = useCallback((): string => {
    if (!undoAction) return "";
    return language === "ar" ? undoAction.descriptionAr : undoAction.description;
  }, [undoAction, language]);

  const getRedoLabel = useCallback((): string => {
    if (!redoAction) return "";
    return language === "ar" ? redoAction.descriptionAr : redoAction.description;
  }, [redoAction, language]);

  return {
    canUndo,
    canRedo,
    undoAction,
    redoAction,
    undo,
    redo,
    getUndoLabel,
    getRedoLabel,
  };
}
