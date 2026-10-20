/**
 * Trash Hook
 * 
 * Provides reactive trash bin state and operations to components.
 */

import { useState, useEffect, useCallback } from "react";
import { trashService, TrashedTask, TrashSettings } from "../services/trash.service";
import { useTasks } from "./useTasks";
import { useTranslation } from "../i18n";
import { useSetRecoilState } from "recoil";
import { toastAtom } from "../store";

export function useTrash() {
  const [items, setItems] = useState<TrashedTask[]>(() => trashService.getItems());
  const [settings, setSettings] = useState<TrashSettings>(() => trashService.getSettings());
  const { restoreTask } = useTasks();
  const { t } = useTranslation();
  const setToast = useSetRecoilState(toastAtom);

  useEffect(() => {
    const unsubscribe = trashService.subscribe((updatedItems, updatedSettings) => {
      setItems(updatedItems);
      setSettings(updatedSettings);
    });

    // Also run an expiration check
    trashService.cleanExpired();

    return () => {
      unsubscribe();
    };
  }, []);

  const restore = useCallback(async (trashId: string) => {
    const trashed = trashService.restoreTask(trashId);
    if (!trashed) return false;

    try {
      await restoreTask(trashed.originalListId, trashed.task);
      setToast({
        title: t("trash.taskRestored"),
        type: "success",
      });
      return true;
    } catch (err) {
      console.error("Failed to restore task:", err);
      // Re-add to trash if restore failed
      trashService.moveToTrash(trashed.task, trashed.originalListTitle);
      return false;
    }
  }, [restoreTask, setToast, t]);

  const removePermanently = useCallback((trashId: string) => {
    const success = trashService.permanentDelete(trashId);
    if (success) {
      setToast({
        title: t("trash.taskPermanentlyDeleted"),
        type: "info",
      });
    }
    return success;
  }, [setToast, t]);

  const emptyAll = useCallback(() => {
    trashService.emptyTrash();
    setToast({
      title: t("trash.trashEmptied"),
      type: "info",
    });
  }, [setToast, t]);

  const updateRetentionSettings = useCallback((newSettings: Partial<TrashSettings>) => {
    const updated = trashService.updateSettings(newSettings);
    setSettings(updated);
  }, []);

  return {
    items,
    count: items.length,
    settings,
    restore,
    removePermanently,
    emptyAll,
    updateRetentionSettings,
  };
}
