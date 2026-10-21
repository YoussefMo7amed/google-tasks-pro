import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Paper,
  CircularProgress,
} from "@mui/material";
import { CloudUpload, Sync, Refresh } from "@mui/icons-material";
import { useRecoilValue } from "recoil";
import { taskListsAtom } from "../../store";
import { useServices } from "../../hooks";
import { useTranslation } from "../../i18n";
import { exitGuestMode } from "../../helpers/auth";

interface SyncGuestTasksModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function SyncGuestTasksModal({
  open,
  onClose,
  onComplete,
}: SyncGuestTasksModalProps) {
  const { t } = useTranslation();
  const taskLists = useRecoilValue(taskListsAtom);
  const { tasks: taskService, taskLists: taskListService } = useServices();
  const [loading, setLoading] = useState(false);

  const totalLocalTasks = taskLists.reduce((sum, list) => sum + (list.tasks?.length || 0), 0);

  const handleMergeAndUpload = async () => {
    if (!taskService || !taskListService) {
      exitGuestMode();
      onComplete();
      return;
    }

    setLoading(true);
    try {
      // 1. Fetch current Google cloud lists to find matching titles
      const cloudLists = await taskListService.getAll(true);
      const cloudListMap = new Map<string, string>();
      for (const cl of cloudLists) {
        cloudListMap.set(cl.title.toLowerCase().trim(), cl.id);
      }

      // 2. Iterate local lists and create missing ones or merge tasks into existing
      for (const localList of taskLists) {
        let targetListId = cloudListMap.get(localList.title.toLowerCase().trim());

        if (!targetListId) {
          try {
            const createdList = await taskListService.create(localList.title);
            targetListId = createdList.id;
            cloudListMap.set(localList.title.toLowerCase().trim(), targetListId);
          } catch (listErr) {
            console.warn("Failed to create cloud list, using fallback:", listErr);
            targetListId = cloudLists[0]?.id;
          }
        }

        if (targetListId && localList.tasks && localList.tasks.length > 0) {
          for (const task of localList.tasks) {
            try {
              await taskService.createTask({
                listId: targetListId,
                title: task.title,
                notes: task.notes,
                due: task.due ? new Date(task.due) : undefined,
                exactTime: task.exactTime,
                recurrence: task.recurrence,
              });
            } catch (taskErr) {
              console.warn("Failed to upload local task:", taskErr);
            }
          }
        }
      }

      exitGuestMode();
      onComplete();
    } catch (err) {
      console.error("Error during guest tasks merge:", err);
      exitGuestMode();
      onComplete();
    } finally {
      setLoading(false);
    }
  };

  const handleStartFresh = () => {
    exitGuestMode();
    onComplete();
  };

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
        <Sync sx={{ color: "primary.main" }} />
        <span>{t("auth.syncModalTitle")}</span>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          {t("auth.syncModalDesc")} ({totalLocalTasks} {t("common.tasks")})
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {/* Option 1: Merge & Upload */}
          <Paper
            elevation={0}
            onClick={loading ? undefined : handleMergeAndUpload}
            sx={{
              p: 2,
              border: 2,
              borderColor: "primary.main",
              borderRadius: 2,
              cursor: loading ? "default" : "pointer",
              transition: "all 0.2s",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(66, 133, 244, 0.08)" : "rgba(66, 133, 244, 0.05)",
              "&:hover": {
                transform: loading ? "none" : "translateY(-1px)",
                borderColor: "primary.dark",
              },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <CloudUpload sx={{ color: "primary.main", mt: 0.25 }} />
              <Box>
                <Typography variant="subtitle2" fontWeight="700">
                  {t("auth.syncMergeBtn")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("auth.syncMergeDesc")}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Option 2: Start Fresh */}
          <Paper
            elevation={0}
            onClick={loading ? undefined : handleStartFresh}
            sx={{
              p: 2,
              border: 1,
              borderColor: "divider",
              borderRadius: 2,
              cursor: loading ? "default" : "pointer",
              transition: "all 0.2s",
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <Refresh sx={{ color: "text.secondary", mt: 0.25 }} />
              <Box>
                <Typography variant="subtitle2" fontWeight="600">
                  {t("auth.syncReplaceBtn")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("auth.syncReplaceDesc")}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        {loading && <CircularProgress size={22} sx={{ mr: 1 }} />}
        <Button onClick={onClose} disabled={loading} color="inherit">
          {t("common.cancel")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
