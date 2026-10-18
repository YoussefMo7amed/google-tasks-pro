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
} from "@mui/icons-material";
import { AppTask } from "../../types/app";
import { useRecoilValue } from "recoil";
import { taskListsAtom } from "../../store";
import {
  QuadrantType,
  extractQuadrant,
  applyQuadrantToTitle,
} from "../../services/history.service";

interface TaskDetailModalProps {
  task: AppTask | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (task: AppTask, title: string, notes?: string, due?: Date) => Promise<void>;
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
  const taskLists = useRecoilValue(taskListsAtom);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [selectedListId, setSelectedListId] = useState("");
  const [quadrant, setQuadrant] = useState<QuadrantType | undefined>(undefined);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sync state whenever the opened task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setNotes(task.notes || "");
      setDueDate(task.due ? new Date(task.due) : null);
      setSelectedListId(task.listId || "");
      setQuadrant(extractQuadrant(task.title));
      setNewSubtaskTitle("");
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
        dueDate || undefined
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
            {isCompleted ? "Completed" : "Mark as completed"}
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
          placeholder="Task title"
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
            Eisenhower Matrix / مصفوفة أيزنهاور
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            <Chip
              label="🔴 Q1: Do (هام وعاجل)"
              size="small"
              onClick={() => handleQuadrantToggle("Q1")}
              color={quadrant === "Q1" ? "error" : "default"}
              variant={quadrant === "Q1" ? "filled" : "outlined"}
              sx={{ fontWeight: quadrant === "Q1" ? 600 : 400, borderRadius: "8px" }}
            />
            <Chip
              label="🔵 Q2: Schedule (هام وغير عاجل)"
              size="small"
              onClick={() => handleQuadrantToggle("Q2")}
              color={quadrant === "Q2" ? "primary" : "default"}
              variant={quadrant === "Q2" ? "filled" : "outlined"}
              sx={{ fontWeight: quadrant === "Q2" ? 600 : 400, borderRadius: "8px" }}
            />
            <Chip
              label="🟡 Q3: Delegate (عاجل وغير هام)"
              size="small"
              onClick={() => handleQuadrantToggle("Q3")}
              color={quadrant === "Q3" ? "warning" : "default"}
              variant={quadrant === "Q3" ? "filled" : "outlined"}
              sx={{ fontWeight: quadrant === "Q3" ? 600 : 400, borderRadius: "8px" }}
            />
            <Chip
              label="⚪ Q4: Eliminate (غير هام وغير عاجل)"
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
              Due Date
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Chip
              label="Today"
              size="small"
              onClick={() => handleSetQuickDate(0)}
              variant="outlined"
            />
            <Chip
              label="Tomorrow"
              size="small"
              onClick={() => handleSetQuickDate(1)}
              variant="outlined"
            />
            <Chip
              label="Next Week"
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
                Clear
              </Button>
            )}
          </Box>
        </Box>

        {/* Target List Selector */}
        <Box sx={{ mt: 2.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <DriveFileMove sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: "text.secondary" }}>
              List
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
            Notes & Details
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            maxRows={8}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add detailed notes, links, or instructions..."
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
              Subtasks {subtasks.length > 0 && `(${subtasks.length})`}
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
                placeholder="Add a new subtask..."
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
                Add
              </Button>
            </Box>
          )}
        </Box>
      </DialogContent>

      <Divider sx={{ mx: 2, mt: 2 }} />

      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving || !title.trim()}
          sx={{ textTransform: "none", px: 3, borderRadius: "8px" }}
        >
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
