/**
 * Calendar Tasks View Component
 * 
 * Displays tasks organized on a monthly visual calendar grid according to their due date.
 * Features:
 * - Month navigation (Prev, Next, Today)
 * - Highlights today and overdue tasks
 * - Color-coded Eisenhower quadrant badges (Q1-Q4)
 * - Interactive task completion, inspection with TaskDetailModal
 * - Quick-add task on any specific date
 * - Filter by Task List and toggle completed tasks
 */

import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Button,
  Chip,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
} from "@mui/material";
import {
  ChevronLeft,
  ChevronRight,
  Today,
  Add,
  WarningAmber,
  CheckCircleOutline,
  EventNote,
} from "@mui/icons-material";
import { useRecoilValue } from "recoil";
import { taskListsAtom } from "../../store/atoms";
import { useTasks, useTaskLists } from "../../hooks";
import { AppTask, AppTaskList } from "../../types/app";
import { extractQuadrant, cleanTitleFromQuadrant } from "../../services/history.service";
import TaskDetailModal from "./TaskDetailModal";

const QUADRANT_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  Q1: { bg: "#fee2e2", color: "#dc2626", label: "Q1" },
  Q2: { bg: "#fef3c7", color: "#d97706", label: "Q2" },
  Q3: { bg: "#e0e7ff", color: "#4f46e5", label: "Q3" },
  Q4: { bg: "#f3f4f6", color: "#4b5563", label: "Q4" },
};

const WEEKDAYS = [
  { key: 6, ar: "السبت", en: "Sat" },
  { key: 0, ar: "الأحد", en: "Sun" },
  { key: 1, ar: "الإثنين", en: "Mon" },
  { key: 2, ar: "الثلاثاء", en: "Tue" },
  { key: 3, ar: "الأربعاء", en: "Wed" },
  { key: 4, ar: "الخميس", en: "Thu" },
  { key: 5, ar: "الجمعة", en: "Fri" },
];

const MONTH_NAMES_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDueDate(dueStr?: string | null): string | null {
  if (!dueStr) return null;
  // Due strings in Google Tasks are ISO: "YYYY-MM-DDTHH:mm:ss.sssZ" or "YYYY-MM-DD"
  return dueStr.substring(0, 10);
}

export default function CalendarTasksView() {
  const taskLists = useRecoilValue(taskListsAtom);
  const {
    toggleTaskComplete,
    toggleTaskStar,
    deleteTask,
    updateTask,
    createTask,
    createSubtask,
    moveTaskToList,
  } = useTasks();
  const { taskLists: allLists } = useTaskLists();

  // Current view date (year & month)
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedListId, setSelectedListId] = useState<string>("all");
  const [showCompleted, setShowCompleted] = useState<boolean>(true);

  // Modal inspection
  const [detailTask, setDetailTask] = useState<AppTask | null>(null);

  // Quick add dialog on a specific day
  const [quickAddDate, setQuickAddDate] = useState<string | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [quickAddListId, setQuickAddListId] = useState<string>("");

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const todayStr = useMemo(() => formatDateKey(new Date()), []);

  // Collect all tasks with list metadata
  const allTasksWithList = useMemo(() => {
    const items: Array<{ task: AppTask; list: AppTaskList }> = [];
    taskLists.forEach((list) => {
      if (selectedListId !== "all" && list.id !== selectedListId) return;
      list.tasks.forEach((task) => {
        if (!showCompleted && task.status === "completed") return;
        items.push({ task, list });
      });
    });
    return items;
  }, [taskLists, selectedListId, showCompleted]);

  // Group tasks by dueDate (YYYY-MM-DD)
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Array<{ task: AppTask; list: AppTaskList }>>();
    allTasksWithList.forEach((item) => {
      const dateKey = parseDueDate(item.task.due);
      if (dateKey) {
        const existing = map.get(dateKey) || [];
        existing.push(item);
        map.set(dateKey, existing);
      }
    });
    return map;
  }, [allTasksWithList]);

  // Metrics: overdue & today
  const overdueTasks = useMemo(() => {
    return allTasksWithList.filter((item) => {
      const dateKey = parseDueDate(item.task.due);
      return (
        dateKey &&
        dateKey < todayStr &&
        item.task.status !== "completed"
      );
    });
  }, [allTasksWithList, todayStr]);

  const todayTasks = useMemo(() => {
    return tasksByDate.get(todayStr) || [];
  }, [tasksByDate, todayStr]);

  // Generate calendar grid cells (42 cells: 6 weeks * 7 days, starting Saturday)
  const calendarDays = useMemo(() => {
    // First day of current month
    const firstDay = new Date(currentYear, currentMonth, 1);
    const dayOfWeek = firstDay.getDay(); // 0 (Sun) to 6 (Sat)
    
    // In our grid Saturday is index 0. Mapping:
    // Sat = 0, Sun = 1, Mon = 2, Tue = 3, Wed = 4, Thu = 5, Fri = 6
    const satOffset = (dayOfWeek + 1) % 7;

    const startDate = new Date(currentYear, currentMonth, 1 - satOffset);

    const days: Array<{
      date: Date;
      dateKey: string;
      isCurrentMonth: boolean;
      isToday: boolean;
    }> = [];

    for (let i = 0; i < 42; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dKey = formatDateKey(d);
      days.push({
        date: d,
        dateKey: dKey,
        isCurrentMonth: d.getMonth() === currentMonth,
        isToday: dKey === todayStr,
      });
    }

    return days;
  }, [currentYear, currentMonth, todayStr]);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleGoToday = () => {
    setCurrentDate(new Date());
  };

  // Open Quick Add Dialog
  const handleOpenQuickAdd = (dateKey: string) => {
    setQuickAddDate(dateKey);
    setQuickAddTitle("");
    const defaultList = taskLists[0]?.id || "";
    setQuickAddListId(selectedListId !== "all" ? selectedListId : defaultList);
  };

  const handleSaveQuickAdd = async () => {
    if (!quickAddTitle.trim() || !quickAddListId || !quickAddDate) return;
    try {
      await createTask({
        listId: quickAddListId,
        title: quickAddTitle.trim(),
        due: new Date(quickAddDate + "T23:59:59.000Z"),
      });
      setQuickAddDate(null);
      setQuickAddTitle("");
    } catch (e) {
      console.error("Failed to add task on date", e);
    }
  };

  const handleTaskUpdate = async (t: AppTask, title: string, notes?: string, due?: Date) => {
    await updateTask(t.listId, t.id, title, notes, due);
  };
  const handleTaskToggle = async (t: AppTask) => {
    await toggleTaskComplete(t.listId, t.id);
  };
  const handleTaskStar = async (t: AppTask) => {
    await toggleTaskStar(t.listId, t.id);
  };
  const handleTaskDelete = async (t: AppTask) => {
    await deleteTask(t.listId, t.id);
  };
  const handleTaskMove = async (t: AppTask, toListId: string) => {
    await moveTaskToList(t.listId, t.id, toListId);
  };
  const handleAddSubtask = async (t: AppTask, title: string) => {
    await createSubtask(t.listId, t.id, title);
  };

  return (
    <Box
      sx={{
        flex: 1,
        width: "100%",
        maxWidth: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        p: 2.5,
        overflowY: "auto",
        overflowX: "hidden",
        bgcolor: "background.default",
        fontFamily: "Cairo, sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* Top Bar: Navigation, Metrics & Filters */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          mb: 2,
        }}
      >
        {/* Month Navigation & Title */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton size="small" onClick={handlePrevMonth} sx={{ border: 1, borderColor: "divider" }} title="الشهر السابق">
            <ChevronLeft />
          </IconButton>
          
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontFamily: "Cairo, sans-serif",
              minWidth: 150,
              textAlign: "center",
            }}
          >
            {MONTH_NAMES_AR[currentMonth]} {currentYear}
          </Typography>

          <IconButton size="small" onClick={handleNextMonth} sx={{ border: 1, borderColor: "divider" }} title="الشهر القادم">
            <ChevronRight />
          </IconButton>

          <Button
            size="small"
            variant="outlined"
            startIcon={<Today sx={{ fontSize: 16 }} />}
            onClick={handleGoToday}
            sx={{
              ml: 1,
              fontFamily: "Cairo, sans-serif",
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.8rem",
            }}
          >
            اليوم
          </Button>
        </Box>

        {/* Metrics Badges */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {overdueTasks.length > 0 && (
            <Tooltip title="مهام فات موعد استحقاقها">
              <Chip
                icon={<WarningAmber sx={{ fontSize: 16, color: "#dc2626 !important" }} />}
                label={`${overdueTasks.length} متأخرة`}
                size="small"
                sx={{
                  bgcolor: "#fee2e2",
                  color: "#dc2626",
                  fontWeight: 700,
                  fontFamily: "Cairo, sans-serif",
                }}
              />
            </Tooltip>
          )}

          <Chip
            icon={<EventNote sx={{ fontSize: 16, color: "#2563eb !important" }} />}
            label={`${todayTasks.length} مهام اليوم`}
            size="small"
            sx={{
              bgcolor: "#dbeafe",
              color: "#1d4ed8",
              fontWeight: 600,
              fontFamily: "Cairo, sans-serif",
            }}
          />

          <Chip
            icon={<CheckCircleOutline sx={{ fontSize: 16 }} />}
            label={`${allTasksWithList.length} مهام معروضة`}
            size="small"
            variant="outlined"
            sx={{ fontFamily: "Cairo, sans-serif", fontWeight: 600 }}
          />
        </Box>

        {/* Filters */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="calendar-list-select-label" sx={{ fontFamily: "Cairo, sans-serif", fontSize: "0.85rem" }}>
              القائمة
            </InputLabel>
            <Select
              labelId="calendar-list-select-label"
              value={selectedListId}
              label="القائمة"
              onChange={(e) => setSelectedListId(e.target.value)}
              sx={{ borderRadius: "10px", fontSize: "0.85rem", fontFamily: "Cairo, sans-serif" }}
            >
              <MenuItem value="all" sx={{ fontFamily: "Cairo, sans-serif" }}>
                جميع القوائم
              </MenuItem>
              {allLists.map((list) => (
                <MenuItem key={list.id} value={list.id} sx={{ fontFamily: "Cairo, sans-serif" }}>
                  {list.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            size="small"
            variant={showCompleted ? "contained" : "outlined"}
            color={showCompleted ? "primary" : "inherit"}
            onClick={() => setShowCompleted(!showCompleted)}
            sx={{
              fontFamily: "Cairo, sans-serif",
              borderRadius: "10px",
              textTransform: "none",
              fontSize: "0.78rem",
              fontWeight: 600,
            }}
          >
            {showCompleted ? "المكتملة: ظاهرة" : "المكتملة: مخفية"}
          </Button>
        </Box>
      </Box>

      {/* Calendar Grid Header (Weekdays) */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 1,
          mb: 1,
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {WEEKDAYS.map((wd) => (
          <Paper
            key={wd.key}
            elevation={0}
            sx={{
              py: 0.8,
              textAlign: "center",
              bgcolor: "action.hover",
              borderRadius: "10px",
              border: 1,
              borderColor: "divider",
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 700, fontFamily: "Cairo, sans-serif", color: "text.primary" }}>
              {wd.ar}
            </Typography>
          </Paper>
        ))}
      </Box>

      {/* Calendar Grid Body (42 cells) */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gridAutoRows: "minmax(120px, 1fr)",
          gap: 1,
          width: "100%",
          boxSizing: "border-box",
          flex: 1,
        }}
      >
        {calendarDays.map(({ date, dateKey, isCurrentMonth, isToday }) => {
          const dayTasks = tasksByDate.get(dateKey) || [];

          return (
            <Paper
              key={dateKey}
              elevation={0}
              sx={{
                p: 1,
                display: "flex",
                flexDirection: "column",
                borderRadius: "12px",
                border: 1,
                borderColor: isToday ? "primary.main" : "divider",
                bgcolor: isToday
                  ? "action.selected"
                  : isCurrentMonth
                  ? "background.paper"
                  : "action.hover",
                opacity: isCurrentMonth ? 1 : 0.5,
                transition: "all 0.15s ease",
                minWidth: 0,
                width: "100%",
                boxSizing: "border-box",
                overflow: "hidden",
                "&:hover": {
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  borderColor: isToday ? "primary.main" : "text.secondary",
                  "& .day-add-btn": {
                    opacity: 1,
                  },
                },
              }}
            >
              {/* Day Header */}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
                <Box
                  sx={{
                    width: 26,
                    height: 26,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                    bgcolor: isToday ? "primary.main" : "transparent",
                    color: isToday ? "#fff" : "text.primary",
                    fontWeight: isToday ? 800 : 600,
                    fontSize: "0.85rem",
                  }}
                >
                  {date.getDate()}
                </Box>

                <IconButton
                  className="day-add-btn"
                  size="small"
                  onClick={() => handleOpenQuickAdd(dateKey)}
                  sx={{
                    p: 0.25,
                    opacity: 0,
                    transition: "opacity 0.2s",
                    bgcolor: "action.hover",
                    "&:hover": { bgcolor: "action.selected" },
                  }}
                >
                  <Add sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>

              {/* Day Tasks List */}
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.6,
                  overflowY: "auto",
                  overflowX: "hidden",
                  maxHeight: 140,
                  pr: 0.25,
                  width: "100%",
                  minWidth: 0,
                  boxSizing: "border-box",
                }}
              >
                {dayTasks.map(({ task }) => {
                  const quadrant = extractQuadrant(task.title);
                  const cleanTitle = cleanTitleFromQuadrant(task.title);
                  const isDone = task.status === "completed";
                  const isOverdue = !isDone && dateKey < todayStr;
                  const qColor = quadrant ? QUADRANT_COLORS[quadrant] : null;

                  return (
                    <Paper
                      key={task.id}
                      elevation={0}
                      onClick={() => setDetailTask(task)}
                      sx={{
                        p: 0.6,
                        px: 0.8,
                        borderRadius: "8px",
                        border: 1,
                        borderColor: isOverdue ? "#fca5a5" : isDone ? "transparent" : "divider",
                        borderLeft: isOverdue ? "3.5px solid #dc2626" : undefined,
                        bgcolor: isOverdue ? "rgba(254, 226, 226, 0.35)" : isDone ? "action.hover" : "background.default",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.6,
                        transition: "all 0.15s ease",
                        opacity: isDone ? 0.6 : 1,
                        width: "100%",
                        minWidth: 0,
                        maxWidth: "100%",
                        boxSizing: "border-box",
                        overflow: "hidden",
                        "&:hover": {
                          bgcolor: "action.selected",
                          borderColor: isOverdue ? "#dc2626" : "primary.light",
                        },
                      }}
                    >
                      {/* Completion check */}
                      <Checkbox
                        size="small"
                        checked={isDone}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTaskComplete(task.listId, task.id);
                        }}
                        sx={{ p: 0, width: 18, height: 18, flexShrink: 0 }}
                      />

                      {/* Quadrant badge */}
                      {qColor && (
                        <Box
                          component="span"
                          sx={{
                            px: 0.5,
                            py: 0.1,
                            borderRadius: "4px",
                            bgcolor: qColor.bg,
                            color: qColor.color,
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {qColor.label}
                        </Box>
                      )}

                      {/* Title */}
                      <Typography
                        variant="caption"
                        noWrap
                        dir="auto"
                        title={cleanTitle}
                        sx={{
                          flex: 1,
                          minWidth: 0,
                          fontFamily: "Cairo, sans-serif",
                          fontWeight: 500,
                          fontSize: "0.76rem",
                          textDecoration: isDone ? "line-through" : "none",
                          color: isOverdue ? "error.main" : isDone ? "text.secondary" : "text.primary",
                          unicodeBidi: "plaintext",
                          textAlign: "start",
                        }}
                      >
                        {cleanTitle}
                      </Typography>
                    </Paper>
                  );
                })}
              </Box>
            </Paper>
          );
        })}
      </Box>

      {/* Quick Add Task Dialog */}
      <Dialog
        open={Boolean(quickAddDate)}
        onClose={() => setQuickAddDate(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: "16px", p: 1 } }}
      >
        <DialogTitle sx={{ fontFamily: "Cairo, sans-serif", fontWeight: 700, pb: 1 }}>
          إضافة مهمة بتاريخ {quickAddDate}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          <TextField
            autoFocus
            fullWidth
            label="عنوان المهمة"
            value={quickAddTitle}
            onChange={(e) => setQuickAddTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSaveQuickAdd();
              }
            }}
            size="small"
            InputProps={{ sx: { fontFamily: "Cairo, sans-serif" } }}
            InputLabelProps={{ sx: { fontFamily: "Cairo, sans-serif" } }}
          />

          <FormControl fullWidth size="small">
            <InputLabel id="quick-add-list-label" sx={{ fontFamily: "Cairo, sans-serif" }}>
              القائمة
            </InputLabel>
            <Select
              labelId="quick-add-list-label"
              value={quickAddListId}
              label="القائمة"
              onChange={(e) => setQuickAddListId(e.target.value)}
              sx={{ fontFamily: "Cairo, sans-serif" }}
            >
              {allLists.map((l) => (
                <MenuItem key={l.id} value={l.id} sx={{ fontFamily: "Cairo, sans-serif" }}>
                  {l.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setQuickAddDate(null)} sx={{ fontFamily: "Cairo, sans-serif" }}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveQuickAdd}
            disabled={!quickAddTitle.trim()}
            sx={{ fontFamily: "Cairo, sans-serif", borderRadius: "8px" }}
          >
            إضافة المهمة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Detail Modal */}
      <TaskDetailModal
        task={detailTask}
        open={Boolean(detailTask)}
        onClose={() => setDetailTask(null)}
        onUpdate={handleTaskUpdate}
        onToggle={handleTaskToggle}
        onStar={handleTaskStar}
        onDelete={handleTaskDelete}
        onMove={handleTaskMove}
        onAddSubtask={handleAddSubtask}
      />
    </Box>
  );
}
