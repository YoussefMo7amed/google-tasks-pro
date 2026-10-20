/**
 * Task Detail Modal ("Sub-Window" Card)
 * 
 * Rich popup card for viewing and editing tasks:
 * - Full Arabic & English title (multiline, dir="auto")
 * - Eisenhower Matrix Quadrant tags [Q1]-[Q4]
 * - Detailed multiline notes (dir="auto")
 * - Due date shortcuts and date picker
 * - Move to other task lists
 * - Subtasks checklist
 * - Star and Delete controls
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  IconButton,
  Button,
  Chip,
  Checkbox,
  Divider,
  MenuItem,
  Select,
  FormControl,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Popover,
  RadioGroup,
  FormControlLabel,
  Radio,
} from "@mui/material";
import {
  Close,
  Star,
  StarBorder,
  Delete,
  RadioButtonUnchecked,
  CheckCircle,
  PlaylistAddCheck,
  DriveFileMove,
  Add,
  CalendarToday,
  AccessTime,
  Repeat,
} from "@mui/icons-material";
import { AppTask, RecurrenceRule, RecurrenceFrequency, RecurrenceEndType } from "../../types/app";
import { useRecoilValue } from "recoil";
import { taskListsAtom } from "../../store";
import {
  QuadrantType,
  extractQuadrant,
  applyQuadrantToTitle,
} from "../../services/history.service";
import { recurrenceService } from "../../services/recurrence.service";
import { useTranslation } from "../../i18n";

interface TaskDetailModalProps {
  task: AppTask | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (
    task: AppTask,
    title: string,
    notes?: string,
    due?: Date,
    exactTime?: string,
    recurrence?: RecurrenceRule
  ) => Promise<void>;
  onToggle: (task: AppTask) => Promise<void>;
  onStar: (task: AppTask) => Promise<void>;
  onDelete: (task: AppTask) => Promise<void>;
  onMove: (task: AppTask, toListId: string) => Promise<void>;
  onAddSubtask?: (task: AppTask, title: string) => Promise<void>;
}

export default function TaskDetailModal({
  task,
  open,
  onClose,
  onUpdate,
  onToggle,
  onStar,
  onDelete,
  onMove,
  onAddSubtask,
}: TaskDetailModalProps) {
  const { t, language } = useTranslation();
  const taskLists = useRecoilValue(taskListsAtom);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [selectedListId, setSelectedListId] = useState("");
  const [quadrant, setQuadrant] = useState<QuadrantType | undefined>(undefined);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Time & Recurrence state
  const [exactTime, setExactTime] = useState<string>("");
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(null);
  const [timeAnchorEl, setTimeAnchorEl] = useState<HTMLElement | null>(null);
  const [repeatAnchorEl, setRepeatAnchorEl] = useState<HTMLElement | null>(null);

  // Recurrence rule editor
  const [repeatFreq, setRepeatFreq] = useState<RecurrenceFrequency>("weekly");
  const [repeatInterval, setRepeatInterval] = useState<number>(1);
  const [repeatDays, setRepeatDays] = useState<number[]>([5]);
  const [repeatEndType, setRepeatEndType] = useState<RecurrenceEndType>("never");
  const [repeatEndDate, setRepeatEndDate] = useState<string>("");
  const [repeatEndCount, setRepeatEndCount] = useState<number>(10);

  // Sync state whenever the opened task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setNotes(task.notes || "");
      setDueDate(task.due ? new Date(task.due) : null);
      setSelectedListId(task.listId || "");
      setQuadrant(extractQuadrant(task.title));
      setNewSubtaskTitle("");

      setExactTime(task.exactTime || "");
      const existingRule = task.recurrence || recurrenceService.getRule(task.id);
      setRecurrence(existingRule || null);
      if (existingRule) {
        setRepeatFreq(existingRule.frequency);
        setRepeatInterval(existingRule.interval);
        if (existingRule.daysOfWeek) setRepeatDays(existingRule.daysOfWeek);
        setRepeatEndType(existingRule.endType);
        if (existingRule.endDate) setRepeatEndDate(existingRule.endDate);
        if (existingRule.endCount) setRepeatEndCount(existingRule.endCount);
      }
    }
  }, [task]);

  if (!task) return null;

  // Find subtasks belonging to this task across lists
  const currentList = taskLists.find((l) => l.id === task.listId);
  const subtasks = currentList?.tasks.filter((t) => t.parent === task.id) || [];

  const handleQuadrantToggle = (targetQ: QuadrantType) => {
    const nextQ = quadrant === targetQ ? undefined : targetQ;
    setQuadrant(nextQ);
    const updatedTitle = applyQuadrantToTitle(title, nextQ || null);
    setTitle(updatedTitle);
  };

  const handleSetQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setHours(23, 59, 0, 0);
    setDueDate(d);
  };

  const handleDayOfWeekToggle = (dayIndex: number) => {
    setRepeatDays((prev) => {
      if (prev.includes(dayIndex)) {
        return prev.length > 1 ? prev.filter((d) => d !== dayIndex) : prev;
      }
      return [...prev, dayIndex].sort((a, b) => a - b);
    });
  };

  const handleSaveRepeat = () => {
    const rule: RecurrenceRule = {
      frequency: repeatFreq,
      interval: Math.max(1, repeatInterval),
      daysOfWeek: repeatFreq === "weekly" ? repeatDays : undefined,
      time: exactTime || undefined,
      endType: repeatEndType,
      endDate: repeatEndType === "on_date" ? repeatEndDate : undefined,
      endCount: repeatEndType === "after_occurrences" ? repeatEndCount : undefined,
    };
    setRecurrence(rule);
    if (!dueDate) {
      handleSetQuickDate(0);
    }
    setRepeatAnchorEl(null);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      // If list changed, move it first
      if (selectedListId && selectedListId !== task.listId) {
        await onMove(task, selectedListId);
      }

      await onUpdate(
        task,
        title.trim(),
        notes.trim() ? notes.trim() : undefined,
        dueDate || undefined,
        exactTime || undefined,
        recurrence || undefined
      );
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSubtaskSubmit = async () => {
    if (newSubtaskTitle.trim() && onAddSubtask) {
      await onAddSubtask(task, newSubtaskTitle.trim());
      setNewSubtaskTitle("");
    }
  };

  const isCompleted = task.status === "completed";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          bgcolor: "background.paper",
          backgroundImage: "none",
          border: 1,
          borderColor: "divider",
          boxShadow: "0 12px 32px rgba(0,0,0,0.6)",
          p: 1,
        },
      }}
    >
      {/* Top Header Bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          pt: 1.5,
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Checkbox
            checked={isCompleted}
            onClick={() => onToggle(task)}
            icon={<RadioButtonUnchecked sx={{ fontSize: 24 }} />}
            checkedIcon={<CheckCircle sx={{ fontSize: 24 }} color="primary" />}
            sx={{ p: 0.5 }}
          />
          <Typography
            variant="body2"
            color={isCompleted ? "primary.main" : "text.secondary"}
            sx={{ fontWeight: 500 }}
          >
            {isCompleted ? t("tasks.completed") : t("tasks.markAsCompleted")}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => onStar(task)}
            sx={{ color: task.isStarred ? "warning.main" : "text.secondary" }}
          >
            {task.isStarred ? <Star /> : <StarBorder />}
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              onDelete(task);
              onClose();
            }}
            sx={{ color: "error.light" }}
          >
            <Delete fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={onClose} sx={{ color: "text.secondary" }}>
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Divider sx={{ mx: 2, mb: 1.5 }} />

      <DialogContent sx={{ px: 2, py: 1 }}>
        {/* Title Field (Full & Multiline) */}
        <TextField
          fullWidth
          multiline
          minRows={1}
          maxRows={4}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("tasks.taskTitlePlaceholder")}
          variant="standard"
          InputProps={{ disableUnderline: true }}
          inputProps={{ dir: "auto" }}
          sx={{
            "& .MuiInputBase-input": {
              fontSize: "1.2rem",
              fontWeight: 600,
              lineHeight: 1.4,
              unicodeBidi: "plaintext",
              textAlign: "start",
            },
          }}
        />

        {/* Eisenhower Matrix Quadrants Selection */}
        <Box sx={{ mt: 2, mb: 1.5 }}>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              color: "text.secondary",
              fontWeight: 600,
              mb: 1,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            {t("eisenhower.title")}
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            <Chip
              label={`🔴 ${t("eisenhower.q1Title")}`}
              size="small"
              onClick={() => handleQuadrantToggle("Q1")}
              color={quadrant === "Q1" ? "error" : "default"}
              variant={quadrant === "Q1" ? "filled" : "outlined"}
              sx={{ fontWeight: quadrant === "Q1" ? 600 : 400, borderRadius: "8px" }}
            />
            <Chip
              label={`🔵 ${t("eisenhower.q2Title")}`}
              size="small"
              onClick={() => handleQuadrantToggle("Q2")}
              color={quadrant === "Q2" ? "primary" : "default"}
              variant={quadrant === "Q2" ? "filled" : "outlined"}
              sx={{ fontWeight: quadrant === "Q2" ? 600 : 400, borderRadius: "8px" }}
            />
            <Chip
              label={`🟡 ${t("eisenhower.q3Title")}`}
              size="small"
              onClick={() => handleQuadrantToggle("Q3")}
              color={quadrant === "Q3" ? "warning" : "default"}
              variant={quadrant === "Q3" ? "filled" : "outlined"}
              sx={{ fontWeight: quadrant === "Q3" ? 600 : 400, borderRadius: "8px" }}
            />
            <Chip
              label={`⚪ ${t("eisenhower.q4Title")}`}
              size="small"
              onClick={() => handleQuadrantToggle("Q4")}
              variant={quadrant === "Q4" ? "filled" : "outlined"}
              sx={{
                fontWeight: quadrant === "Q4" ? 600 : 400,
                borderRadius: "8px",
                bgcolor: quadrant === "Q4" ? "rgba(255,255,255,0.2)" : undefined,
              }}
            />
          </Box>
        </Box>

        {/* Due Date Row */}
        <Box sx={{ mt: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <CalendarToday sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
              {t("tasks.dueDate")}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Chip
              label={t("tasks.today")}
              size="small"
              onClick={() => handleSetQuickDate(0)}
              variant="outlined"
            />
            <Chip
              label={t("tasks.tomorrow")}
              size="small"
              onClick={() => handleSetQuickDate(1)}
              variant="outlined"
            />
            <Chip
              label={t("tasks.nextWeek")}
              size="small"
              onClick={() => handleSetQuickDate(7)}
              variant="outlined"
            />
            <TextField
              type="date"
              size="small"
              value={dueDate ? dueDate.toISOString().split("T")[0] : ""}
              onChange={(e) => {
                if (e.target.value) {
                  const d = new Date(e.target.value);
                  d.setHours(23, 59, 0, 0);
                  setDueDate(d);
                } else {
                  setDueDate(null);
                }
              }}
              sx={{
                "& .MuiInputBase-input": {
                  py: 0.6,
                  px: 1,
                  fontSize: "0.85rem",
                },
              }}
            />
            {dueDate && (
              <Button
                size="small"
                onClick={() => setDueDate(null)}
                sx={{ textTransform: "none", color: "text.secondary" }}
              >
                {t("common.clear")}
              </Button>
            )}
          </Box>

          {/* Time & Recurrence Controls */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
            <Chip
              icon={<AccessTime sx={{ fontSize: 16 }} />}
              label={exactTime ? `${t("tasks.time")}: ${exactTime}` : t("tasks.setTime")}
              size="small"
              onClick={(e) => setTimeAnchorEl(e.currentTarget)}
              onDelete={exactTime ? () => setExactTime("") : undefined}
              color={exactTime ? "info" : "default"}
              variant={exactTime ? "filled" : "outlined"}
              sx={{ borderRadius: "8px" }}
            />
            <Chip
              icon={<Repeat sx={{ fontSize: 16 }} />}
              label={recurrence ? `${t("tasks.repeats")}: ${t(`tasks.${recurrence.frequency}`)}` : t("tasks.repeats")}
              size="small"
              onClick={(e) => setRepeatAnchorEl(e.currentTarget)}
              onDelete={recurrence ? () => setRecurrence(null) : undefined}
              color={recurrence ? "secondary" : "default"}
              variant={recurrence ? "filled" : "outlined"}
              sx={{ borderRadius: "8px" }}
            />
          </Box>
        </Box>

        {/* Target List Selector */}
        <Box sx={{ mt: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <DriveFileMove sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
              {t("tasks.list")}
            </Typography>
          </Box>
          <FormControl fullWidth size="small">
            <Select
              value={selectedListId}
              onChange={(e) => setSelectedListId(e.target.value)}
              sx={{
                borderRadius: "8px",
                bgcolor: "background.default",
              }}
            >
              {taskLists.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Notes / Details */}
        <Box sx={{ mt: 2.5 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 600, color: "text.secondary", mb: 0.5 }}
          >
            {t("tasks.notesAndDetails")}
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            maxRows={8}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("tasks.notesPlaceholder")}
            variant="outlined"
            inputProps={{ dir: "auto" }}
            sx={{
              bgcolor: "background.default",
              borderRadius: "8px",
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
              },
              "& .MuiInputBase-input": {
                fontSize: "0.9rem",
                lineHeight: 1.5,
                unicodeBidi: "plaintext",
                textAlign: "start",
              },
            }}
          />
        </Box>

        {/* Subtasks Section */}
        <Box sx={{ mt: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <PlaylistAddCheck sx={{ fontSize: 20, color: "text.secondary" }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
              {t("tasks.subtasks")} {subtasks.length > 0 && `(${subtasks.length})`}
            </Typography>
          </Box>

          {subtasks.length > 0 && (
            <List dense sx={{ py: 0, mb: 1 }}>
              {subtasks.map((st) => (
                <ListItem
                  key={st.id}
                  disableGutters
                  sx={{
                    py: 0.25,
                    px: 1,
                    borderRadius: "6px",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Checkbox
                      size="small"
                      checked={st.status === "completed"}
                      onClick={() => onToggle(st)}
                      icon={<RadioButtonUnchecked sx={{ fontSize: 18 }} />}
                      checkedIcon={<CheckCircle sx={{ fontSize: 18 }} color="primary" />}
                      sx={{ p: 0.25 }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={st.title}
                    primaryTypographyProps={{
                      variant: "body2",
                      dir: "auto",
                      sx: {
                        textDecoration: st.status === "completed" ? "line-through" : "none",
                        opacity: st.status === "completed" ? 0.6 : 1,
                        unicodeBidi: "plaintext",
                        textAlign: "start",
                      },
                    }}
                  />
                  <IconButton size="small" onClick={() => onDelete(st)}>
                    <Delete fontSize="small" sx={{ fontSize: 16 }} />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          )}

          {/* Add Subtask Input */}
          {onAddSubtask && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder={t("tasks.addNewSubtaskPlaceholder")}
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubtaskSubmit();
                  }
                }}
                inputProps={{ dir: "auto" }}
                sx={{
                  bgcolor: "background.default",
                  borderRadius: "8px",
                  "& .MuiOutlinedInput-root": { borderRadius: "8px" },
                  "& .MuiInputBase-input": {
                    py: 0.75,
                    fontSize: "0.85rem",
                    unicodeBidi: "plaintext",
                  },
                }}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<Add />}
                onClick={handleAddSubtaskSubmit}
                disabled={!newSubtaskTitle.trim()}
                sx={{ borderRadius: "8px", textTransform: "none", whiteSpace: "nowrap" }}
              >
                {t("common.add")}
              </Button>
            </Box>
          )}
        </Box>
      </DialogContent>

      <Divider sx={{ mx: 2, mt: 2 }} />

      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          {t("common.cancel")}
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving || !title.trim()}
          sx={{ textTransform: "none", px: 3, borderRadius: "8px" }}
        >
          {isSaving ? t("tasks.saving") : t("tasks.saveChanges")}
        </Button>
      </DialogActions>

      {/* Time Picker Popover */}
      <Popover
        open={Boolean(timeAnchorEl)}
        anchorEl={timeAnchorEl}
        onClose={() => setTimeAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5, minWidth: 220 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {t("tasks.setTime")}
          </Typography>
          <TextField
            type="time"
            fullWidth
            size="small"
            value={exactTime}
            onChange={(e) => setExactTime(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
            {exactTime && (
              <Button size="small" onClick={() => { setExactTime(""); setTimeAnchorEl(null); }}>
                {t("tasks.clearTime")}
              </Button>
            )}
            <Button size="small" variant="contained" onClick={() => setTimeAnchorEl(null)}>
              {t("common.save")}
            </Button>
          </Box>
        </Box>
      </Popover>

      {/* Repeats Popover */}
      <Popover
        open={Boolean(repeatAnchorEl)}
        anchorEl={repeatAnchorEl}
        onClose={() => setRepeatAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box sx={{ p: 2.5, width: 300, display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t("tasks.repeats")}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography variant="body2" sx={{ minWidth: 50, color: "text.secondary" }}>
              {t("tasks.repeatEvery")}
            </Typography>
            <TextField
              type="number"
              size="small"
              value={repeatInterval}
              onChange={(e) => setRepeatInterval(Math.max(1, parseInt(e.target.value) || 1))}
              sx={{ width: 70 }}
              inputProps={{ min: 1 }}
            />
            <FormControl size="small" sx={{ flex: 1 }}>
              <Select
                value={repeatFreq}
                onChange={(e) => setRepeatFreq(e.target.value as RecurrenceFrequency)}
              >
                <MenuItem value="daily">{t("tasks.daily")}</MenuItem>
                <MenuItem value="weekly">{t("tasks.weekly")}</MenuItem>
                <MenuItem value="monthly">{t("tasks.monthly")}</MenuItem>
                <MenuItem value="yearly">{t("tasks.yearly")}</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {repeatFreq === "weekly" && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", gap: 0.5, mt: 0.5 }}>
                {(language === "ar" ? ["ح", "ن", "ث", "ر", "خ", "ج", "س"] : ["S", "M", "T", "W", "T", "F", "S"]).map((dayName, index) => {
                  const isSelected = repeatDays.includes(index);
                  return (
                    <Button
                      key={dayName + index}
                      size="small"
                      variant={isSelected ? "contained" : "outlined"}
                      onClick={() => handleDayOfWeekToggle(index)}
                      sx={{
                        minWidth: 32,
                        width: 32,
                        height: 32,
                        p: 0,
                        borderRadius: "50%",
                        fontSize: "0.8rem",
                        fontWeight: isSelected ? 700 : 500,
                      }}
                    >
                      {dayName}
                    </Button>
                  );
                })}
              </Box>
            </Box>
          )}

          <Box>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
              {t("tasks.ends")}
            </Typography>
            <RadioGroup
              value={repeatEndType}
              onChange={(e) => setRepeatEndType(e.target.value as RecurrenceEndType)}
              sx={{ mt: 0.5 }}
            >
              <FormControlLabel
                value="never"
                control={<Radio size="small" />}
                label={<Typography variant="body2">{t("tasks.never")}</Typography>}
              />
              <FormControlLabel
                value="on_date"
                control={<Radio size="small" />}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2">{t("tasks.onDate")}</Typography>
                    {repeatEndType === "on_date" && (
                      <TextField
                        type="date"
                        size="small"
                        value={repeatEndDate}
                        onChange={(e) => setRepeatEndDate(e.target.value)}
                        sx={{ width: 140 }}
                      />
                    )}
                  </Box>
                }
              />
              <FormControlLabel
                value="after_occurrences"
                control={<Radio size="small" />}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="body2">{t("tasks.afterOccurrences")}</Typography>
                    {repeatEndType === "after_occurrences" && (
                      <TextField
                        type="number"
                        size="small"
                        value={repeatEndCount}
                        onChange={(e) => setRepeatEndCount(Math.max(1, parseInt(e.target.value) || 1))}
                        sx={{ width: 60 }}
                        inputProps={{ min: 1 }}
                      />
                    )}
                    <Typography variant="body2">{t("tasks.occurrences")}</Typography>
                  </Box>
                }
              />
            </RadioGroup>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}>
            {recurrence ? (
              <Button
                size="small"
                color="error"
                onClick={() => { setRecurrence(null); setRepeatAnchorEl(null); }}
              >
                {t("tasks.removeRepeat")}
              </Button>
            ) : <Box />}
            <Button size="small" variant="contained" onClick={handleSaveRepeat}>
              {t("tasks.saveRepeat")}
            </Button>
          </Box>
        </Box>
      </Popover>
    </Dialog>
  );
}
