/**
 * Unified List View Component
 * 
 * Provides a dense, organized single list/table of tasks with:
 * - Grouping by List, Eisenhower Quadrant, or Due Date
 * - Search & status filters
 * - Fast check/uncheck, starring, and detail editing
 */

import { useState, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Checkbox,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Button,
  Collapse,
  Tooltip,
} from "@mui/material";
import {
  Search,
  Star,
  StarBorder,
  CalendarToday,
  MoreVert,
  DeleteOutline,
  FolderOutlined,
  Add,
  Clear,
  SubdirectoryArrowRight,
  KeyboardArrowDown,
  KeyboardArrowRight,
  UnfoldMore,
  UnfoldLess,
} from "@mui/icons-material";
import { useRecoilValue } from "recoil";
import { taskListsAtom } from "../../store/atoms";
import { useTasks } from "../../hooks";
import { AppTask, AppTaskList } from "../../types/app";
import { extractQuadrant, cleanTitleFromQuadrant } from "../../services/history.service";
import TaskDetailModal from "./TaskDetailModal";
import { useTranslation } from "../../i18n";

const QUADRANT_COLORS: Record<string, { bg: string; color: string }> = {
  Q1: { bg: "#fee2e2", color: "#dc2626" },
  Q2: { bg: "#fef3c7", color: "#d97706" },
  Q3: { bg: "#e0e7ff", color: "#4f46e5" },
  Q4: { bg: "#f3f4f6", color: "#4b5563" },
};

type GroupByOption = "list" | "quadrant" | "dueDate";
type StatusFilter = "all" | "pending" | "completed" | "overdue";
type DateFilter = "all" | "today" | "thisWeek" | "thisMonth";

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDueDate(dueStr?: string | null): string | null {
  if (!dueStr) return null;
  return dueStr.substring(0, 10);
}

function getWeekBounds(isRtl: boolean, refDate: Date = new Date()): { startStr: string; endStr: string } {
  const d = new Date(refDate);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  // In RTL / Arabic: Saturday (6) to Friday (5)
  // In LTR: Sunday (0) to Saturday (6)
  const diffToStart = isRtl ? (day === 6 ? 0 : day + 1) : day;
  const start = new Date(d);
  start.setDate(d.getDate() - diffToStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    startStr: formatDateKey(start),
    endStr: formatDateKey(end),
  };
}

export default function UnifiedListView() {
  const { t, isRtl } = useTranslation();
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

  const [search, setSearch] = useState("");
  const [groupBy, setGroupBy] = useState<GroupByOption>("list");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [detailTask, setDetailTask] = useState<AppTask | null>(null);

  // Quick action menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuTask, setMenuTask] = useState<AppTask | null>(null);

  // Quick add input state per group
  const [quickAddGroup, setQuickAddGroup] = useState<string | null>(null);
  const [quickAddText, setQuickAddText] = useState("");

  const COLLAPSED_GROUPS_STORAGE_KEY = "unified_list_collapsed_groups";

  // Collapsed groups state with localStorage persistence
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const saved = window.localStorage.getItem(COLLAPSED_GROUPS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return new Set(parsed);
        }
      }
    } catch {
      // Ignore parsing errors
    }
    return new Set<string>();
  });

  const toggleGroupCollapse = (groupKey: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          window.localStorage.setItem(COLLAPSED_GROUPS_STORAGE_KEY, JSON.stringify(Array.from(next)));
        }
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const handleToggleAllCollapse = (allKeys: string[]) => {
    const isAllCollapsed = allKeys.length > 0 && allKeys.every((k) => collapsedGroups.has(k));
    const next = isAllCollapsed ? new Set<string>() : new Set(allKeys);
    setCollapsedGroups(next);
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(COLLAPSED_GROUPS_STORAGE_KEY, JSON.stringify(Array.from(next)));
      }
    } catch {
      // Ignore storage errors
    }
  };

  // Flatten all tasks with their list info
  const allTasksWithList = useMemo(() => {
    const items: Array<{ task: AppTask; list: AppTaskList }> = [];
    for (const list of taskLists) {
      if (!list.isVisible) continue;
      for (const task of list.tasks || []) {
        items.push({ task, list });
      }
    }
    return items;
  }, [taskLists]);

  // Filter tasks
  const filteredItems = useMemo(() => {
    const today = formatDateKey(new Date());
    const currentMonth = today.substring(0, 7);
    const bounds = getWeekBounds(isRtl);

    return allTasksWithList.filter(({ task }) => {
      const taskDue = parseDueDate(task.due);
      const isCompleted = task.status === "completed";
      const isOverdue = !isCompleted && !!taskDue && taskDue < today;

      // Status filter
      if (statusFilter === "pending" && isCompleted) return false;
      if (statusFilter === "completed" && !isCompleted) return false;
      if (statusFilter === "overdue" && !isOverdue) return false;

      // Date filter
      if (dateFilter === "today") {
        if (!taskDue || taskDue !== today) return false;
      } else if (dateFilter === "thisWeek") {
        if (!taskDue || taskDue < bounds.startStr || taskDue > bounds.endStr) return false;
      } else if (dateFilter === "thisMonth") {
        if (!taskDue || taskDue.substring(0, 7) !== currentMonth) return false;
      }

      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesNotes = task.notes?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesNotes) return false;
      }

      return true;
    });
  }, [allTasksWithList, statusFilter, dateFilter, search, isRtl]);

  // Group filtered tasks
  const groupedTasks = useMemo(() => {
    const groups: Record<string, Array<{ task: AppTask; list: AppTaskList }>> = {};

    if (groupBy === "list") {
      for (const item of filteredItems) {
        const key = item.list.title;
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
      }

      // Re-order each list's tasks so subtasks appear directly underneath their parent task
      for (const key of Object.keys(groups)) {
        const listItems = groups[key];
        const topLevel = listItems.filter((i) => !i.task.parent);
        const subtasks = listItems.filter((i) => i.task.parent);
        const subtaskMap = new Map<string, typeof listItems>();

        for (const st of subtasks) {
          if (st.task.parent) {
            const existing = subtaskMap.get(st.task.parent) || [];
            existing.push(st);
            subtaskMap.set(st.task.parent, existing);
          }
        }

        const ordered: typeof listItems = [];
        for (const item of topLevel) {
          ordered.push(item);
          const children = subtaskMap.get(item.task.id) || [];
          ordered.push(...children);
        }

        for (const st of subtasks) {
          if (st.task.parent && !topLevel.find((t) => t.task.id === st.task.parent)) {
            ordered.push(st);
          }
        }

        groups[key] = ordered;
      }
    } else if (groupBy === "quadrant") {
      const q1Key = t("eisenhower.q1Title");
      const q2Key = t("eisenhower.q2Title");
      const q3Key = t("eisenhower.q3Title");
      const q4Key = t("eisenhower.q4Title");
      const unassignedKey = t("eisenhower.unassignedTitle");

      groups[q1Key] = [];
      groups[q2Key] = [];
      groups[q3Key] = [];
      groups[q4Key] = [];
      groups[unassignedKey] = [];

      for (const item of filteredItems) {
        const q = extractQuadrant(item.task.title);
        if (q === "Q1") groups[q1Key].push(item);
        else if (q === "Q2") groups[q2Key].push(item);
        else if (q === "Q3") groups[q3Key].push(item);
        else if (q === "Q4") groups[q4Key].push(item);
        else groups[unassignedKey].push(item);
      }
    } else if (groupBy === "dueDate") {
      const today = formatDateKey(new Date());
      const overdueKey = t("tasks.overdue");
      const todayKey = t("tasks.today");
      const upcomingKey = t("tasks.upcoming");
      const noDueDateKey = t("tasks.noDueDate");

      groups[overdueKey] = [];
      groups[todayKey] = [];
      groups[upcomingKey] = [];
      groups[noDueDateKey] = [];

      for (const item of filteredItems) {
        if (!item.task.due) {
          groups[noDueDateKey].push(item);
        } else {
          const dueDay = parseDueDate(item.task.due);
          if (dueDay && dueDay < today) groups[overdueKey].push(item);
          else if (dueDay && dueDay === today) groups[todayKey].push(item);
          else groups[upcomingKey].push(item);
        }
      }
    }

    return groups;
  }, [filteredItems, groupBy, t]);

  const handleQuickAdd = async (groupKey: string) => {
    const title = quickAddText.trim();
    if (!title) return;

    // Resolve target list
    let targetListId = taskLists[0]?.id || "default";
    if (groupBy === "list") {
      const found = taskLists.find((l) => l.title === groupKey);
      if (found) targetListId = found.id;
    }

    await createTask({
      listId: targetListId,
      title,
    });

    setQuickAddText("");
    setQuickAddGroup(null);
  };

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, task: AppTask) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
    setMenuTask(task);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuTask(null);
  };

  const handleDeleteTask = async () => {
    if (menuTask) {
      await deleteTask(menuTask.listId, menuTask.id);
    }
    handleMenuClose();
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
        height: "100%",
        display: "flex",
        flexDirection: "column",
        p: 2.5,
        bgcolor: "background.default",
        overflowY: "auto",
      }}
    >
      {/* Top Filter Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 1.75,
          mb: 2.5,
          borderRadius: 3,
          border: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.5,
        }}
      >
        {/* Search Input */}
        <TextField
          placeholder={`${t("common.search")}...`}
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            minWidth: 200,
            flex: { xs: "1 1 100%", sm: "0 1 240px" },
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" sx={{ color: "text.secondary" }} />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearch("")}>
                  <Clear fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        {/* Group By selector */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {t("tasks.sortBy")}:
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Chip
              size="small"
              label={t("navigation.lists")}
              clickable
              color={groupBy === "list" ? "primary" : "default"}
              onClick={() => setGroupBy("list")}
              sx={{ fontSize: "0.8rem", fontWeight: 600 }}
            />
            <Chip
              size="small"
              label={t("navigation.eisenhowerView")}
              clickable
              color={groupBy === "quadrant" ? "primary" : "default"}
              onClick={() => setGroupBy("quadrant")}
              sx={{ fontSize: "0.8rem", fontWeight: 600 }}
            />
            <Chip
              size="small"
              label={t("tasks.dueDate")}
              clickable
              color={groupBy === "dueDate" ? "primary" : "default"}
              onClick={() => setGroupBy("dueDate")}
              sx={{ fontSize: "0.8rem", fontWeight: 600 }}
            />
          </Box>
        </Box>

        {/* Date Filter selector */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {t("tasks.filterByDate")}:
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Chip
              size="small"
              label={t("tasks.allDates")}
              variant={dateFilter === "all" ? "filled" : "outlined"}
              color={dateFilter === "all" ? "primary" : "default"}
              clickable
              onClick={() => setDateFilter("all")}
              sx={{ fontSize: "0.75rem", fontWeight: dateFilter === "all" ? 600 : 400 }}
            />
            <Chip
              size="small"
              label={t("tasks.today")}
              variant={dateFilter === "today" ? "filled" : "outlined"}
              color={dateFilter === "today" ? "primary" : "default"}
              clickable
              onClick={() => setDateFilter("today")}
              sx={{ fontSize: "0.75rem", fontWeight: dateFilter === "today" ? 600 : 400 }}
            />
            <Chip
              size="small"
              label={t("tasks.thisWeek")}
              variant={dateFilter === "thisWeek" ? "filled" : "outlined"}
              color={dateFilter === "thisWeek" ? "primary" : "default"}
              clickable
              onClick={() => setDateFilter("thisWeek")}
              sx={{ fontSize: "0.75rem", fontWeight: dateFilter === "thisWeek" ? 600 : 400 }}
            />
            <Chip
              size="small"
              label={t("tasks.thisMonth")}
              variant={dateFilter === "thisMonth" ? "filled" : "outlined"}
              color={dateFilter === "thisMonth" ? "primary" : "default"}
              clickable
              onClick={() => setDateFilter("thisMonth")}
              sx={{ fontSize: "0.75rem", fontWeight: dateFilter === "thisMonth" ? 600 : 400 }}
            />
          </Box>
        </Box>

        {/* Status filter & Collapse All */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
            {t("tasks.status")}:
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Chip
              size="small"
              label={t("tasks.pending")}
              variant={statusFilter === "pending" ? "filled" : "outlined"}
              color={statusFilter === "pending" ? "primary" : "default"}
              clickable
              onClick={() => setStatusFilter("pending")}
              sx={{ fontSize: "0.75rem", fontWeight: statusFilter === "pending" ? 600 : 400 }}
            />
            <Chip
              size="small"
              label={t("tasks.overdue")}
              variant={statusFilter === "overdue" ? "filled" : "outlined"}
              color={statusFilter === "overdue" ? "error" : "default"}
              clickable
              onClick={() => setStatusFilter("overdue")}
              sx={{
                fontSize: "0.75rem",
                fontWeight: statusFilter === "overdue" ? 600 : 400,
                ...(statusFilter === "overdue" && {
                  bgcolor: "error.main",
                  color: "#fff",
                }),
              }}
            />
            <Chip
              size="small"
              label={t("tasks.completed")}
              variant={statusFilter === "completed" ? "filled" : "outlined"}
              color={statusFilter === "completed" ? "success" : "default"}
              clickable
              onClick={() => setStatusFilter("completed")}
              sx={{ fontSize: "0.75rem", fontWeight: statusFilter === "completed" ? 600 : 400 }}
            />
            <Chip
              size="small"
              label={t("common.all")}
              variant={statusFilter === "all" ? "filled" : "outlined"}
              clickable
              onClick={() => setStatusFilter("all")}
              sx={{ fontSize: "0.75rem", fontWeight: statusFilter === "all" ? 600 : 400 }}
            />
          </Box>

          {/* Expand / Collapse All Toggle Button */}
          {(() => {
            const allGroupKeys = Object.keys(groupedTasks);
            const isAllCollapsed = allGroupKeys.length > 0 && allGroupKeys.every((k) => collapsedGroups.has(k));
            return (
              <Tooltip title={isAllCollapsed ? t("tasks.expandAll") : t("tasks.collapseAll")}>
                <IconButton
                  size="small"
                  onClick={() => handleToggleAllCollapse(allGroupKeys)}
                  sx={{
                    p: 0.75,
                    border: 1,
                    borderColor: "divider",
                    color: "text.secondary",
                    "&:hover": {
                      color: "text.primary",
                      bgcolor: "action.hover",
                    },
                  }}
                >
                  {isAllCollapsed ? <UnfoldMore fontSize="small" /> : <UnfoldLess fontSize="small" />}
                </IconButton>
              </Tooltip>
            );
          })()}
        </Box>
      </Paper>

      {/* Task Groups */}
      {Object.entries(groupedTasks).map(([groupTitle, items]) => {
        if (items.length === 0 && groupBy !== "list") return null;

        const isAddingInThisGroup = quickAddGroup === groupTitle;
        const isCollapsed = collapsedGroups.has(groupTitle);

        return (
          <Box key={groupTitle} sx={{ mb: 2.5 }}>
            {/* Group Header */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1,
                px: 1,
              }}
            >
              <Box
                onClick={() => toggleGroupCollapse(groupTitle)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  cursor: "pointer",
                  userSelect: "none",
                  py: 0.5,
                  px: 0.75,
                  borderRadius: 2,
                  transition: "background-color 0.15s ease",
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
              >
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroupCollapse(groupTitle);
                  }}
                  sx={{
                    p: 0.25,
                    color: "text.secondary",
                  }}
                >
                  {isCollapsed ? (
                    <KeyboardArrowRight sx={{ fontSize: 20, transform: isRtl ? "scaleX(-1)" : "none" }} />
                  ) : (
                    <KeyboardArrowDown sx={{ fontSize: 20 }} />
                  )}
                </IconButton>
                <FolderOutlined fontSize="small" sx={{ color: "primary.main" }} />
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  sx={{ fontSize: "0.98rem" }}
                >
                  {groupTitle}
                </Typography>
                <Chip
                  size="small"
                  label={items.length}
                  sx={{ height: 20, fontSize: "0.72rem", fontWeight: 700 }}
                />
              </Box>

              <Button
                size="small"
                startIcon={<Add />}
                onClick={() => {
                  setQuickAddGroup(groupTitle);
                  setQuickAddText("");
                  if (isCollapsed) toggleGroupCollapse(groupTitle);
                }}
                sx={{
                  fontSize: "0.75rem",
                  textTransform: "none",
                }}
              >
                {t("tasks.addTask")}
              </Button>
            </Box>

            {/* Collapsible Group Content */}
            <Collapse in={!isCollapsed} timeout="auto">

            {/* Quick Add Bar */}
            {isAddingInThisGroup && (
              <Paper
                sx={{
                  p: 1.25,
                  mb: 1,
                  display: "flex",
                  gap: 1,
                  alignItems: "center",
                  borderRadius: 2,
                  bgcolor: "action.hover",
                }}
              >
                <TextField
                  placeholder={`${t("tasks.addTask")} ("${groupTitle}")...`}
                  size="small"
                  fullWidth
                  autoFocus
                  value={quickAddText}
                  onChange={(e) => setQuickAddText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleQuickAdd(groupTitle);
                    if (e.key === "Escape") setQuickAddGroup(null);
                  }}
                  inputProps={{
                    dir: "auto",
                    style: { fontSize: "0.9rem" },
                  }}
                />
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => handleQuickAdd(groupTitle)}
                  disabled={!quickAddText.trim()}
                >
                  {t("common.save")}
                </Button>
                <Button
                  size="small"
                  onClick={() => setQuickAddGroup(null)}
                >
                  {t("common.cancel")}
                </Button>
              </Paper>
            )}

            {/* Tasks Table / Card List */}
            <Paper
              elevation={0}
              sx={{
                borderRadius: 2.5,
                border: 1,
                borderColor: "divider",
                bgcolor: "background.paper",
                overflow: "hidden",
              }}
            >
              {items.length === 0 ? (
                <Box sx={{ py: 3, textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    {t("tasks.noTasks")}
                  </Typography>
                </Box>
              ) : (
                items.map(({ task, list }) => {
                  const isCompleted = task.status === "completed";
                  const isSubtask = !!task.parent;
                  const quadrant = extractQuadrant(task.title);
                  const cleanTitle = cleanTitleFromQuadrant(task.title);
                  // Clean notes from standalone quadrant marks [Q1]-[Q4]
                  const rawNotes = task.notes?.trim() || "";
                  const cleanNotes = cleanTitleFromQuadrant(rawNotes).trim();
                  const hasRealNotes = Boolean(
                    cleanNotes &&
                    !/^\[?Q[1-4]\]?$/i.test(cleanNotes) &&
                    !/^\[?(مربع|ربع)\s*[1-4]\]?$/i.test(cleanNotes)
                  );

                  return (
                    <Box
                      key={task.id}
                      onClick={() => setDetailTask(task)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        py: 1.2,
                        px: 2,
                        ...(isSubtask ? (isRtl ? { pr: 5 } : { pl: 5 }) : {}),
                        borderBottom: 1,
                        borderColor: "divider",
                        cursor: "pointer",
                        transition: "background-color 0.15s",
                        "&:hover": {
                          bgcolor: "action.hover",
                        },
                        "&:last-child": {
                          borderBottom: 0,
                        },
                      }}
                    >
                      {/* Left side: subtask arrow, checkbox, star, title */}
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, overflow: "hidden", flex: 1 }}>
                        {isSubtask && (
                          <SubdirectoryArrowRight
                            fontSize="small"
                            sx={{
                              fontSize: 16,
                              color: "text.disabled",
                              mr: isRtl ? 0 : 0.25,
                              ml: isRtl ? 0.25 : 0,
                              transform: isRtl ? "scaleX(-1)" : "none",
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <Box
                          component="span"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskComplete(list.id, task.id);
                          }}
                          sx={{ display: "inline-flex", p: 0.5, flexShrink: 0, cursor: "pointer" }}
                        >
                          <Checkbox
                            size="small"
                            checked={isCompleted}
                            sx={{ p: 0 }}
                          />
                        </Box>

                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskStar(list.id, task.id);
                          }}
                          sx={{ p: 0.5, color: task.isStarred ? "#f59e0b" : "text.disabled", flexShrink: 0 }}
                        >
                          {task.isStarred ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
                        </IconButton>

                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography
                            variant="body2"
                            title={cleanTitle}
                            sx={{
                              fontSize: "0.92rem",
                              fontWeight: 600,
                              textDecoration: isCompleted ? "line-through" : "none",
                              color: isCompleted ? "text.secondary" : "text.primary",
                              unicodeBidi: "plaintext",
                              textAlign: "start",
                            }}
                            dir="auto"
                            noWrap
                          >
                            {cleanTitle}
                          </Typography>
                          {hasRealNotes && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              title={cleanNotes}
                              sx={{
                                display: "-webkit-box",
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                unicodeBidi: "plaintext",
                                textAlign: "start",
                              }}
                              dir="auto"
                            >
                              {cleanNotes}
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      {/* Right side: badges & actions */}
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0, marginInlineStart: 1.5 }}>
                        {/* List Name Badge (if not grouped by list) */}
                        {groupBy !== "list" && (
                          <Chip
                            size="small"
                            label={list.title}
                            variant="outlined"
                            sx={{
                              height: 22,
                              fontSize: "0.72rem",
                            }}
                          />
                        )}

                        {/* Quadrant Badge */}
                        {quadrant && (
                          <Chip
                            size="small"
                            label={quadrant}
                            sx={{
                              height: 22,
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              bgcolor: QUADRANT_COLORS[quadrant]?.bg,
                              color: QUADRANT_COLORS[quadrant]?.color,
                            }}
                          />
                        )}

                        {/* Due Date */}
                        {task.due && (
                          <Chip
                            size="small"
                            icon={<CalendarToday sx={{ fontSize: "0.75rem !important" }} />}
                            label={task.due.split("T")[0]}
                            variant="outlined"
                            color={!isCompleted && task.due.substring(0, 10) < formatDateKey(new Date()) ? "error" : "default"}
                            sx={{ height: 22, fontSize: "0.72rem" }}
                          />
                        )}

                        {/* More menu */}
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, task)}
                          sx={{ p: 0.5, opacity: 0.6, "&:hover": { opacity: 1 } }}
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Paper>
            </Collapse>
          </Box>
        );
      })}

      {/* Item Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        PaperProps={{ sx: { minWidth: 160 } }}
      >
        <MenuItem onClick={handleDeleteTask}>
          <ListItemIcon>
            <DeleteOutline fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primaryTypographyProps={{ color: "error.main" }}>
            {t("tasks.deleteTask")}
          </ListItemText>
        </MenuItem>
      </Menu>

      {/* Task Detail Modal */}
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
