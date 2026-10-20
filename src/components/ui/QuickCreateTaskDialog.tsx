/**
 * Quick Create Task Dialog
 * 
 * Floating modal triggered by global shortcut (N / C) from any view.
 * Allows quick task entry with target list selection and due date.
 */

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Close, AddTask, CalendarMonth } from "@mui/icons-material";
import { useRecoilState, useRecoilValue } from "recoil";
import { createTaskModalOpenAtom, taskListsAtom, viewStateAtom } from "../../store";
import { useTasks } from "../../hooks";
import { useTranslation } from "../../i18n";

export default function QuickCreateTaskDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useRecoilState(createTaskModalOpenAtom);
  const taskLists = useRecoilValue(taskListsAtom);
  const viewState = useRecoilValue(viewStateAtom);
  const { createTask } = useTasks();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState<string>("");
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Initialize selected list and reset inputs when opened
  useEffect(() => {
    if (open) {
      setTitle("");
      setNotes("");
      setDueDate("");
      setSaving(false);

      const defaultListId =
        viewState.activeListId && taskLists.some((l) => l.id === viewState.activeListId)
          ? viewState.activeListId
          : taskLists[0]?.id || "";
      setSelectedListId(defaultListId);

      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 80);
    }
  }, [open, viewState.activeListId, taskLists]);

  const handleClose = () => {
    setOpen(false);
  };

  const handleSave = async () => {
    if (!title.trim() || !selectedListId || saving) return;

    setSaving(true);
    try {
      await createTask({
        title: title.trim(),
        notes: notes.trim() || undefined,
        due: dueDate ? new Date(dueDate) : undefined,
        listId: selectedListId,
      });
      setOpen(false);
    } catch (err) {
      console.error("Failed to create task:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        },
      }}
    >
      <DialogTitle
        sx={{
          p: 2,
          px: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 0.75,
              borderRadius: "10px",
              bgcolor: "action.selected",
              color: "primary.main",
            }}
          >
            <AddTask fontSize="small" />
          </Box>
          <Typography variant="subtitle1" fontWeight={700}>
            {t("tasks.addTask")}
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleClose} sx={{ color: "text.secondary" }}>
          <Close fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
        {/* Target List Selection */}
        {taskLists.length > 1 && (
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel id="target-list-select-label">{t("tasks.list")}</InputLabel>
            <Select
              labelId="target-list-select-label"
              value={selectedListId}
              label={t("tasks.list")}
              onChange={(e) => setSelectedListId(e.target.value)}
            >
              {taskLists.map((list) => (
                <MenuItem key={list.id} value={list.id}>
                  {list.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        {/* Task Title */}
        <TextField
          autoFocus
          fullWidth
          size="small"
          inputRef={titleInputRef}
          label={t("tasks.taskTitlePlaceholder")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSave();
            }
          }}
          inputProps={{ dir: "auto" }}
          sx={{ mt: taskLists.length <= 1 ? 1 : 0 }}
        />

        {/* Details / Notes */}
        <TextField
          fullWidth
          multiline
          rows={3}
          size="small"
          label={t("tasks.notesPlaceholder")}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          inputProps={{ dir: "auto" }}
        />

        {/* Due Date */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <CalendarMonth sx={{ color: "text.secondary", fontSize: 20 }} />
          <TextField
            type="date"
            size="small"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            sx={{ flex: 1 }}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 1.5, px: 2.5, borderTop: 1, borderColor: "divider" }}>
        <Button onClick={handleClose} sx={{ textTransform: "none" }}>
          {t("common.cancel")}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!title.trim() || saving}
          sx={{ textTransform: "none", borderRadius: "10px" }}
        >
          {saving ? t("tasks.saving") : t("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
